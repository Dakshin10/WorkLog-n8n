-- Migration 003: PostgreSQL PL/pgSQL Business Functions for WorkLog AI
BEGIN;

-- Helper Audit Logging Function
CREATE OR REPLACE FUNCTION wl.wl_audit(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_action VARCHAR,
    p_actor UUID,
    p_channel wl.channel DEFAULT 'SYSTEM',
    p_before JSONB DEFAULT NULL,
    p_after JSONB DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO wl.audit_log (entity_type, entity_id, action, actor_id, channel, before, after, reason)
    VALUES (p_entity_type, p_entity_id, p_action, p_actor, p_channel, p_before, p_after, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

-- Helper Permission Check Function
CREATE OR REPLACE FUNCTION wl.wl_can_view(p_actor UUID, p_employee UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_role wl.role;
    v_target_mgr UUID;
BEGIN
    IF p_actor = p_employee THEN
        RETURN TRUE;
    END IF;

    SELECT role INTO v_actor_role FROM wl.employees WHERE id = p_actor;
    IF v_actor_role = 'HR_ADMIN' THEN
        RETURN TRUE;
    END IF;

    IF v_actor_role = 'MANAGER' THEN
        SELECT manager_id INTO v_target_mgr FROM wl.employees WHERE id = p_employee;
        IF v_target_mgr = p_actor THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

-- 1. Entry Validation Function
CREATE OR REPLACE FUNCTION wl.wl_validate_entry(
    p_employee UUID,
    p_entry JSONB,
    p_existing_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_project_id UUID;
    v_activity_id UUID;
    v_work_date DATE;
    v_hours NUMERIC(4,2);
    v_task TEXT;
    v_outcome TEXT;
    
    v_missing JSONB := '[]'::jsonb;
    v_errors JSONB := '[]'::jsonb;
    v_warnings JSONB := '[]'::jsonb;
    
    v_settings RECORD;
    v_emp RECORD;
    v_proj RECORD;
    v_act RECORD;
    v_assigned BOOLEAN;
    v_existing_hours NUMERIC(4,2) := 0.0;
    v_today DATE;
BEGIN
    SELECT * INTO v_settings FROM wl.org_settings WHERE id = 1;
    SELECT * INTO v_emp FROM wl.employees WHERE id = p_employee;
    
    IF v_emp.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('code', 'USER_NOT_FOUND', 'message', 'Employee not found')));
    END IF;

    -- Compute employee local today
    v_today := (CURRENT_TIMESTAMP AT TIMEZONE COALESCE(v_emp.timezone, v_settings.timezone))::date;

    -- Extract values
    v_project_id := (p_entry->>'project_id')::uuid;
    v_activity_id := (p_entry->>'activity_id')::uuid;
    v_hours := (p_entry->>'hours')::numeric;
    v_task := trim(p_entry->>'task_description');
    v_outcome := p_entry->>'outcome';
    
    IF p_entry->>'work_date' IS NOT NULL THEN
        v_work_date := (p_entry->>'work_date')::date;
    ELSE
        v_work_date := v_today;
    END IF;

    -- Check missing fields in order
    IF v_project_id IS NULL THEN v_missing := v_missing || jsonb_build_array('project_id'); END IF;
    IF v_activity_id IS NULL THEN v_missing := v_missing || jsonb_build_array('activity_id'); END IF;
    IF v_hours IS NULL THEN v_missing := v_missing || jsonb_build_array('hours'); END IF;
    IF v_task IS NULL OR length(v_task) = 0 THEN v_missing := v_missing || jsonb_build_array('task_description'); END IF;
    IF p_entry->>'work_date' IS NULL THEN v_missing := v_missing || jsonb_build_array('work_date'); END IF;

    IF jsonb_array_length(v_missing) > 0 THEN
        RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array(), 'missing_fields', v_missing, 'warnings', v_warnings);
    END IF;

    -- Validate Project
    SELECT * INTO v_proj FROM wl.projects WHERE id = v_project_id;
    IF v_proj.id IS NULL THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'PROJECT_NOT_FOUND', 'field', 'project_id', 'message', 'Specified project does not exist.'));
    ELSIF v_proj.status = 'ARCHIVED' THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'PROJECT_ARCHIVED', 'field', 'project_id', 'message', 'Specified project is archived.'));
    ELSE
        -- Check assignment
        SELECT EXISTS(SELECT 1 FROM wl.project_assignments WHERE employee_id = p_employee AND project_id = v_project_id) INTO v_assigned;
        IF NOT v_assigned AND v_emp.role != 'HR_ADMIN' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'NOT_ASSIGNED_TO_PROJECT', 'field', 'project_id', 'message', 'You are not assigned to this project.'));
        END IF;
    END IF;

    -- Validate Activity
    SELECT * INTO v_act FROM wl.activities WHERE id = v_activity_id;
    IF v_act.id IS NULL THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'ACTIVITY_NOT_FOUND', 'field', 'activity_id', 'message', 'Specified activity does not exist.'));
    ELSIF v_act.status = 'ARCHIVED' THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'ACTIVITY_ARCHIVED', 'field', 'activity_id', 'message', 'Specified activity is archived.'));
    ELSIF v_act.project_id != v_project_id THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'ACTIVITY_NOT_IN_PROJECT', 'field', 'activity_id', 'message', 'Activity does not belong to the selected project.'));
    END IF;

    -- Validate Hours
    IF v_hours <= 0 OR v_hours > 16.00 OR (v_hours * 4.0) != floor(v_hours * 4.0) THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'HOURS_INVALID', 'field', 'hours', 'message', 'Hours must be greater than 0, up to 16, in increments of 0.25 (15 mins).'));
    ELSE
        -- Check Daily Limit
        SELECT COALESCE(SUM(hours), 0.0) INTO v_existing_hours
        FROM wl.timesheets
        WHERE employee_id = p_employee
          AND work_date = v_work_date
          AND status != 'REJECTED'
          AND (p_existing_id IS NULL OR id != p_existing_id);

        IF (v_existing_hours + v_hours) > v_settings.max_hours_per_day THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'code', 'HOURS_EXCEED_DAILY_LIMIT',
                'field', 'hours',
                'message', format('Total hours for %s would be %s h, exceeding daily limit of %s h (already logged: %s h).', v_work_date, (v_existing_hours + v_hours), v_settings.max_hours_per_day, v_existing_hours)
            ));
        END IF;
    END IF;

    -- Validate Work Date
    IF v_work_date > v_today THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'DATE_IN_FUTURE', 'field', 'work_date', 'message', 'Cannot log work for a future date.'));
    ELSIF v_work_date < (v_today - v_settings.backdate_days) THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'DATE_TOO_OLD', 'field', 'work_date', 'message', format('Cannot log work older than %s days.', v_settings.backdate_days)));
    END IF;

    -- Validate Task Description
    IF length(v_task) < 5 THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'TASK_TOO_SHORT', 'field', 'task_description', 'message', 'Task description must be at least 5 characters long.'));
    ELSIF length(v_task) > 1000 THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'TASK_TOO_LONG', 'field', 'task_description', 'message', 'Task description cannot exceed 1000 characters.'));
    END IF;

    -- Check Duplicate Warning
    IF EXISTS(
        SELECT 1 FROM wl.timesheets
        WHERE employee_id = p_employee
          AND work_date = v_work_date
          AND project_id = v_project_id
          AND activity_id = v_activity_id
          AND status != 'REJECTED'
          AND (p_existing_id IS NULL OR id != p_existing_id)
    ) THEN
        v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code', 'POSSIBLE_DUPLICATE', 'message', 'You already have an entry for this project and activity on this date.'));
    END IF;

    IF jsonb_array_length(v_errors) > 0 THEN
        RETURN jsonb_build_object('ok', false, 'errors', v_errors, 'missing_fields', '[]'::jsonb, 'warnings', v_warnings);
    END IF;

    RETURN jsonb_build_object('ok', true, 'errors', '[]'::jsonb, 'missing_fields', '[]'::jsonb, 'warnings', v_warnings);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

-- 2. Create Single Timesheet Function
CREATE OR REPLACE FUNCTION wl.wl_create_timesheet(
    p_employee UUID,
    p_entry JSONB,
    p_submit BOOLEAN DEFAULT TRUE,
    p_channel wl.channel DEFAULT 'WEB'
) RETURNS JSONB AS $$
DECLARE
    v_val JSONB;
    v_ts_id UUID;
    v_status wl.ts_status;
    v_submitted_at TIMESTAMPTZ := NULL;
    v_work_date DATE;
    v_hours NUMERIC(4,2);
    v_day_total NUMERIC(4,2);
BEGIN
    v_val := wl.wl_validate_entry(p_employee, p_entry);
    IF NOT (v_val->>'ok')::boolean THEN
        RETURN v_val;
    END IF;

    IF p_submit THEN
        v_status := 'SUBMITTED';
        v_submitted_at := CURRENT_TIMESTAMP;
    ELSE
        v_status := 'DRAFT';
    END IF;

    v_work_date := COALESCE((p_entry->>'work_date')::date, CURRENT_DATE);
    v_hours := (p_entry->>'hours')::numeric;

    INSERT INTO wl.timesheets (
        employee_id, project_id, activity_id, work_date, hours,
        task_description, outcome, notes, status, current_version,
        source_channel, submitted_at
    ) VALUES (
        p_employee, (p_entry->>'project_id')::uuid, (p_entry->>'activity_id')::uuid,
        v_work_date, v_hours, trim(p_entry->>'task_description'),
        p_entry->>'outcome', p_entry->>'notes', v_status, 1,
        p_channel, v_submitted_at
    ) RETURNING id INTO v_ts_id;

    -- Version 1 record on submit
    IF p_submit THEN
        INSERT INTO wl.timesheet_versions (
            timesheet_id, version, project_id, activity_id, work_date,
            hours, task_description, outcome, notes, status, created_by
        ) VALUES (
            v_ts_id, 1, (p_entry->>'project_id')::uuid, (p_entry->>'activity_id')::uuid,
            v_work_date, v_hours, trim(p_entry->>'task_description'),
            p_entry->>'outcome', p_entry->>'notes', v_status, p_employee
        );
    END IF;

    -- Audit log
    PERFORM wl.wl_audit('TIMESHEET', v_ts_id, CASE WHEN p_submit THEN 'CREATE_SUBMIT' ELSE 'CREATE_DRAFT' END, p_employee, p_channel, NULL, p_entry);

    -- Compute day total
    SELECT COALESCE(SUM(hours), 0.0) INTO v_day_total
    FROM wl.timesheets
    WHERE employee_id = p_employee AND work_date = v_work_date AND status != 'REJECTED';

    RETURN jsonb_build_object(
        'ok', true,
        'id', v_ts_id,
        'status', v_status,
        'warnings', v_val->'warnings',
        'day_total', v_day_total
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

-- 3. Create Timesheets Batch Function (All-or-Nothing)
CREATE OR REPLACE FUNCTION wl.wl_create_timesheets_batch(
    p_employee UUID,
    p_entries JSONB[],
    p_submit BOOLEAN DEFAULT TRUE,
    p_channel wl.channel DEFAULT 'WEB'
) RETURNS JSONB AS $$
DECLARE
    v_entry JSONB;
    v_val JSONB;
    v_batch_errors JSONB := '[]'::jsonb;
    v_created_ids UUID[] := ARRAY[]::UUID[];
    v_res JSONB;
    v_idx INT := 0;
BEGIN
    -- Step 1: Validate all first
    FOREACH v_entry IN ARRAY p_entries LOOP
        v_idx := v_idx + 1;
        v_val := wl.wl_validate_entry(p_employee, v_entry);
        IF NOT (v_val->>'ok')::boolean THEN
            v_batch_errors := v_batch_errors || jsonb_build_array(jsonb_build_object('index', v_idx, 'validation', v_val));
        END IF;
    END LOOP;

    IF jsonb_array_length(v_batch_errors) > 0 THEN
        RETURN jsonb_build_object('ok', false, 'errors', v_batch_errors);
    END IF;

    -- Step 2: Create all
    FOREACH v_entry IN ARRAY p_entries LOOP
        v_res := wl.wl_create_timesheet(p_employee, v_entry, p_submit, p_channel);
        v_created_ids := array_append(v_created_ids, (v_res->>'id')::uuid);
    END LOOP;

    RETURN jsonb_build_object('ok', true, 'ids', to_jsonb(v_created_ids));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

-- 4. Update Timesheet Function
CREATE OR REPLACE FUNCTION wl.wl_update_timesheet(
    p_actor UUID,
    p_id UUID,
    p_changes JSONB,
    p_reason TEXT DEFAULT NULL,
    p_channel wl.channel DEFAULT 'WEB'
) RETURNS JSONB AS $$
DECLARE
    v_ts RECORD;
    v_merged JSONB;
    v_val JSONB;
    v_new_version INT;
BEGIN
    SELECT * INTO v_ts FROM wl.timesheets WHERE id = p_id;
    IF v_ts.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Timesheet entry not found');
    END IF;

    IF v_ts.employee_id != p_actor THEN
        RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'You can only update your own timesheets');
    END IF;

    IF v_ts.status = 'APPROVED' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'USE_EDIT_REQUEST', 'message', 'Approved timesheets require a change request.');
    END IF;

    IF v_ts.status IN ('SUBMITTED', 'CHANGES_REQUESTED') AND (p_reason IS NULL OR length(trim(p_reason)) < 5) THEN
        RETURN jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'A reason of at least 5 characters is required to update submitted timesheets.');
    END IF;

    -- Merge changes
    v_merged := jsonb_build_object(
        'project_id', COALESCE(p_changes->>'project_id', v_ts.project_id::text),
        'activity_id', COALESCE(p_changes->>'activity_id', v_ts.activity_id::text),
        'work_date', COALESCE(p_changes->>'work_date', v_ts.work_date::text),
        'hours', COALESCE(p_changes->>'hours', v_ts.hours::text),
        'task_description', COALESCE(p_changes->>'task_description', v_ts.task_description),
        'outcome', COALESCE(p_changes->>'outcome', v_ts.outcome)
    );

    v_val := wl.wl_validate_entry(p_actor, v_merged, p_id);
    IF NOT (v_val->>'ok')::boolean THEN
        RETURN v_val;
    END IF;

    v_new_version := v_ts.current_version + 1;

    UPDATE wl.timesheets SET
        project_id = (v_merged->>'project_id')::uuid,
        activity_id = (v_merged->>'activity_id')::uuid,
        work_date = (v_merged->>'work_date')::date,
        hours = (v_merged->>'hours')::numeric,
        task_description = v_merged->>'task_description',
        outcome = v_merged->>'outcome',
        current_version = v_new_version,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_id;

    IF v_ts.status IN ('SUBMITTED', 'CHANGES_REQUESTED') THEN
        INSERT INTO wl.timesheet_versions (
            timesheet_id, version, project_id, activity_id, work_date,
            hours, task_description, outcome, status, change_reason, created_by
        ) VALUES (
            p_id, v_new_version, (v_merged->>'project_id')::uuid, (v_merged->>'activity_id')::uuid,
            (v_merged->>'work_date')::date, (v_merged->>'hours')::numeric,
            v_merged->>'task_description', v_merged->>'outcome', v_ts.status, p_reason, p_actor
        );
    END IF;

    PERFORM wl.wl_audit('TIMESHEET', p_id, 'UPDATE', p_actor, p_channel, to_jsonb(v_ts), v_merged, p_reason);

    RETURN jsonb_build_object('ok', true, 'id', p_id, 'status', v_ts.status, 'version', v_new_version);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

-- 5. Delete Timesheet Function
CREATE OR REPLACE FUNCTION wl.wl_delete_timesheet(
    p_actor UUID,
    p_id UUID,
    p_channel wl.channel DEFAULT 'WEB'
) RETURNS JSONB AS $$
DECLARE
    v_ts RECORD;
BEGIN
    SELECT * INTO v_ts FROM wl.timesheets WHERE id = p_id;
    IF v_ts.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Timesheet not found');
    END IF;

    IF v_ts.employee_id != p_actor THEN
        RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'You can only delete your own draft timesheets');
    END IF;

    IF v_ts.status != 'DRAFT' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'INVALID_STATUS_TRANSITION', 'message', 'Only DRAFT timesheets can be deleted');
    END IF;

    DELETE FROM wl.timesheets WHERE id = p_id;
    PERFORM wl.wl_audit('TIMESHEET', p_id, 'DELETE', p_actor, p_channel, to_jsonb(v_ts), NULL, 'User deleted draft');

    RETURN jsonb_build_object('ok', true, 'id', p_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

-- 6. Transition Status Function
CREATE OR REPLACE FUNCTION wl.wl_transition(
    p_actor UUID,
    p_id UUID,
    p_action TEXT,
    p_reason TEXT DEFAULT NULL,
    p_channel wl.channel DEFAULT 'WEB'
) RETURNS JSONB AS $$
DECLARE
    v_ts RECORD;
    v_actor_emp RECORD;
    v_new_status wl.ts_status;
BEGIN
    SELECT * INTO v_ts FROM wl.timesheets WHERE id = p_id;
    IF v_ts.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Timesheet not found');
    END IF;

    SELECT * INTO v_actor_emp FROM wl.employees WHERE id = p_actor;

    IF p_action = 'submit' THEN
        IF v_ts.employee_id != p_actor THEN
            RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'You can only submit your own timesheets');
        END IF;
        IF v_ts.status NOT IN ('DRAFT', 'CHANGES_REQUESTED') THEN
            RETURN jsonb_build_object('ok', false, 'code', 'INVALID_STATUS_TRANSITION', 'message', format('Cannot submit timesheet with status %s', v_ts.status));
        END IF;
        v_new_status := 'SUBMITTED';

    ELSIF p_action IN ('approve', 'reject', 'request_changes') THEN
        IF v_ts.employee_id = p_actor THEN
            RETURN jsonb_build_object('ok', false, 'code', 'CANNOT_APPROVE_OWN', 'message', 'Managers cannot approve or decide on their own timesheets');
        END IF;
        IF NOT wl.wl_can_view(p_actor, v_ts.employee_id) THEN
            RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'You are not authorized to manage this employee timesheet');
        END IF;
        IF v_ts.status != 'SUBMITTED' THEN
            RETURN jsonb_build_object('ok', false, 'code', 'INVALID_STATUS_TRANSITION', 'message', format('Cannot %s timesheet with status %s', p_action, v_ts.status));
        END IF;

        IF p_action IN ('reject', 'request_changes') AND (p_reason IS NULL OR length(trim(p_reason)) < 5) THEN
            RETURN jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', format('A reason of at least 5 characters is required to %s a timesheet', p_action));
        END IF;

        IF p_action = 'approve' THEN v_new_status := 'APPROVED';
        ELSIF p_action = 'reject' THEN v_new_status := 'REJECTED';
        ELSIF p_action = 'request_changes' THEN v_new_status := 'CHANGES_REQUESTED';
        END IF;

    ELSIF p_action = 'revise' THEN
        IF v_ts.employee_id != p_actor THEN
            RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'You can only revise your own timesheets');
        END IF;
        IF v_ts.status != 'REJECTED' THEN
            RETURN jsonb_build_object('ok', false, 'code', 'INVALID_STATUS_TRANSITION', 'message', 'Only REJECTED timesheets can be revised to DRAFT');
        END IF;
        v_new_status := 'DRAFT';

    ELSE
        RETURN jsonb_build_object('ok', false, 'code', 'INVALID_ACTION', 'message', format('Unknown action %s', p_action));
    END IF;

    -- Apply status transition
    UPDATE wl.timesheets SET
        status = v_new_status,
        submitted_at = CASE WHEN v_new_status = 'SUBMITTED' THEN CURRENT_TIMESTAMP ELSE submitted_at END,
        approved_at = CASE WHEN v_new_status = 'APPROVED' THEN CURRENT_TIMESTAMP ELSE approved_at END,
        approved_by = CASE WHEN v_new_status = 'APPROVED' THEN p_actor ELSE approved_by END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_id;

    -- Record approval record if manager action
    IF p_action IN ('approve', 'reject', 'request_changes') THEN
        INSERT INTO wl.approvals (timesheet_id, actor_id, action, reason)
        VALUES (p_id, p_actor, UPPER(p_action)::wl.approval_action, p_reason);

        -- Insert notification for owner
        INSERT INTO wl.notifications (employee_id, type, payload)
        VALUES (
            v_ts.employee_id,
            'TIMESHEET_' || UPPER(p_action),
            jsonb_build_object('timesheet_id', p_id, 'actor_id', p_actor, 'action', p_action, 'reason', p_reason)
        );
    END IF;

    PERFORM wl.wl_audit('TIMESHEET', p_id, UPPER(p_action), p_actor, p_channel, jsonb_build_object('status', v_ts.status), jsonb_build_object('status', v_new_status), p_reason);

    RETURN jsonb_build_object('ok', true, 'id', p_id, 'status', v_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

-- 7. Submit Range Function
CREATE OR REPLACE FUNCTION wl.wl_submit_range(
    p_employee UUID,
    p_from DATE,
    p_to DATE,
    p_channel wl.channel DEFAULT 'WEB'
) RETURNS JSONB AS $$
DECLARE
    v_count INT;
BEGIN
    WITH updated AS (
        UPDATE wl.timesheets SET
            status = 'SUBMITTED',
            submitted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = p_employee
          AND status IN ('DRAFT', 'CHANGES_REQUESTED')
          AND work_date BETWEEN p_from AND p_to
        RETURNING id
    )
    SELECT count(*) INTO v_count FROM updated;

    PERFORM wl.wl_audit('EMPLOYEE', p_employee, 'SUBMIT_RANGE', p_employee, p_channel, NULL, jsonb_build_object('from', p_from, 'to', p_to, 'submitted_count', v_count));

    RETURN jsonb_build_object('ok', true, 'submitted_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

-- 8. Request Edit Function
CREATE OR REPLACE FUNCTION wl.wl_request_edit(
    p_actor UUID,
    p_id UUID,
    p_changes JSONB,
    p_reason TEXT,
    p_channel wl.channel DEFAULT 'WEB'
) RETURNS JSONB AS $$
DECLARE
    v_ts RECORD;
    v_mgr_id UUID;
    v_edit_id UUID;
BEGIN
    SELECT * INTO v_ts FROM wl.timesheets WHERE id = p_id;
    IF v_ts.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Timesheet not found');
    END IF;

    IF v_ts.employee_id != p_actor THEN
        RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'You can only request edits for your own timesheets');
    END IF;

    IF v_ts.status != 'APPROVED' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'INVALID_STATUS', 'message', 'Edit requests can only be made for APPROVED timesheets');
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'A reason of at least 5 characters is required');
    END IF;

    INSERT INTO wl.edit_requests (timesheet_id, employee_id, proposed_changes, reason, status)
    VALUES (p_id, p_actor, p_changes, p_reason, 'PENDING')
    RETURNING id INTO v_edit_id;

    SELECT manager_id INTO v_mgr_id FROM wl.employees WHERE id = p_actor;
    IF v_mgr_id IS NOT NULL THEN
        INSERT INTO wl.notifications (employee_id, type, payload)
        VALUES (v_mgr_id, 'EDIT_REQUEST_SUBMITTED', jsonb_build_object('edit_request_id', v_edit_id, 'timesheet_id', p_id, 'employee_id', p_actor));
    END IF;

    PERFORM wl.wl_audit('EDIT_REQUEST', v_edit_id, 'EDIT_REQUESTED', p_actor, p_channel, NULL, p_changes, p_reason);

    RETURN jsonb_build_object('ok', true, 'edit_request_id', v_edit_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

-- 9. Decide Edit Request Function
CREATE OR REPLACE FUNCTION wl.wl_decide_edit(
    p_actor UUID,
    p_edit_id UUID,
    p_decision TEXT,
    p_reason TEXT DEFAULT NULL,
    p_channel wl.channel DEFAULT 'WEB'
) RETURNS JSONB AS $$
DECLARE
    v_edit RECORD;
    v_ts RECORD;
    v_new_version INT;
BEGIN
    SELECT * INTO v_edit FROM wl.edit_requests WHERE id = p_edit_id;
    IF v_edit.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Edit request not found');
    END IF;

    IF v_edit.status != 'PENDING' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_DECIDED', 'message', 'This edit request has already been decided');
    END IF;

    IF NOT wl.wl_can_view(p_actor, v_edit.employee_id) OR p_actor = v_edit.employee_id THEN
        RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'Not authorized to decide on this edit request');
    END IF;

    IF p_decision = 'approve' THEN
        SELECT * INTO v_ts FROM wl.timesheets WHERE id = v_edit.timesheet_id;
        v_new_version := v_ts.current_version + 1;

        UPDATE wl.timesheets SET
            project_id = COALESCE((v_edit.proposed_changes->>'project_id')::uuid, project_id),
            activity_id = COALESCE((v_edit.proposed_changes->>'activity_id')::uuid, activity_id),
            work_date = COALESCE((v_edit.proposed_changes->>'work_date')::date, work_date),
            hours = COALESCE((v_edit.proposed_changes->>'hours')::numeric, hours),
            task_description = COALESCE(v_edit.proposed_changes->>'task_description', task_description),
            outcome = COALESCE(v_edit.proposed_changes->>'outcome', outcome),
            current_version = v_new_version,
            approved_by = p_actor,
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_edit.timesheet_id;

        UPDATE wl.edit_requests SET status = 'APPROVED', decided_by = p_actor, decided_at = CURRENT_TIMESTAMP, decision_reason = p_reason WHERE id = p_edit_id;

        PERFORM wl.wl_audit('EDIT_REQUEST', p_edit_id, 'EDIT_APPROVED', p_actor, p_channel, to_jsonb(v_ts), v_edit.proposed_changes, p_reason);
    ELSIF p_decision = 'decline' THEN
        UPDATE wl.edit_requests SET status = 'DECLINED', decided_by = p_actor, decided_at = CURRENT_TIMESTAMP, decision_reason = p_reason WHERE id = p_edit_id;
        PERFORM wl.wl_audit('EDIT_REQUEST', p_edit_id, 'EDIT_DECLINED', p_actor, p_channel, NULL, NULL, p_reason);
    ELSE
        RETURN jsonb_build_object('ok', false, 'code', 'INVALID_DECISION', 'message', 'Decision must be approve or decline');
    END IF;

    -- Notify owner
    INSERT INTO wl.notifications (employee_id, type, payload)
    VALUES (v_edit.employee_id, 'EDIT_REQUEST_' || UPPER(p_decision), jsonb_build_object('edit_request_id', p_edit_id, 'decided_by', p_actor, 'reason', p_reason));

    RETURN jsonb_build_object('ok', true, 'edit_request_id', p_edit_id, 'status', p_decision);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

-- 10. Add Leave Function
CREATE OR REPLACE FUNCTION wl.wl_add_leave(
    p_employee UUID,
    p_date DATE,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
    INSERT INTO wl.leave_markers (employee_id, work_date, notes)
    VALUES (p_employee, p_date, p_notes)
    ON CONFLICT (employee_id, work_date) DO UPDATE SET notes = EXCLUDED.notes;

    RETURN jsonb_build_object('ok', true, 'work_date', p_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = wl, public;

COMMIT;

-- 11. Complete Lifecycle Integration Test DO Block
DO $$
DECLARE
    v_emp_id UUID := '00000000-0000-0000-0000-000000000010';
    v_mgr_id UUID := '00000000-0000-0000-0000-000000000002';
    v_proj_id UUID := '11111111-1111-1111-1111-111111111111';
    v_act_id UUID := 'a1111111-1111-1111-1111-111111111111';
    
    v_res JSONB;
    v_ts_id UUID;
    v_edit_id UUID;
BEGIN
    -- 1. Create Timesheet Draft
    v_res := wl.wl_create_timesheet(
        v_emp_id,
        jsonb_build_object(
            'project_id', v_proj_id,
            'activity_id', v_act_id,
            'work_date', CURRENT_DATE,
            'hours', 4.0,
            'task_description', 'Initial UX wireframe draft work'
        ),
        FALSE,
        'WEB'
    );
    IF NOT (v_res->>'ok')::boolean THEN RAISE EXCEPTION 'FAIL 1: Draft creation: %', v_res; END IF;
    v_ts_id := (v_res->>'id')::uuid;

    -- 2. Submit Timesheet
    v_res := wl.wl_transition(v_emp_id, v_ts_id, 'submit', NULL, 'WEB');
    IF NOT (v_res->>'ok')::boolean THEN RAISE EXCEPTION 'FAIL 2: Submit transition: %', v_res; END IF;

    -- 3. Request Changes by Manager
    v_res := wl.wl_transition(v_mgr_id, v_ts_id, 'request_changes', 'Please add more detailed task description', 'WEB');
    IF NOT (v_res->>'ok')::boolean THEN RAISE EXCEPTION 'FAIL 3: Request changes: %', v_res; END IF;

    -- 4. Update Timesheet by Employee
    v_res := wl.wl_update_timesheet(v_emp_id, v_ts_id, jsonb_build_object('task_description', 'Detailed UX wireframing and interactive prototype work'), 'Updated description per manager comment', 'WEB');
    IF NOT (v_res->>'ok')::boolean THEN RAISE EXCEPTION 'FAIL 4: Update timesheet: %', v_res; END IF;

    -- 5. Submit Again
    v_res := wl.wl_transition(v_emp_id, v_ts_id, 'submit', NULL, 'WEB');
    IF NOT (v_res->>'ok')::boolean THEN RAISE EXCEPTION 'FAIL 5: Submit again: %', v_res; END IF;

    -- 6. Approve by Manager
    v_res := wl.wl_transition(v_mgr_id, v_ts_id, 'approve', 'Looks good!', 'WEB');
    IF NOT (v_res->>'ok')::boolean THEN RAISE EXCEPTION 'FAIL 6: Approve: %', v_res; END IF;

    -- 7. Request Edit by Employee
    v_res := wl.wl_request_edit(v_emp_id, v_ts_id, jsonb_build_object('hours', 4.5), 'Forgot 30 mins client review', 'WEB');
    IF NOT (v_res->>'ok')::boolean THEN RAISE EXCEPTION 'FAIL 7: Request edit: %', v_res; END IF;
    v_edit_id := (v_res->>'edit_request_id')::uuid;

    -- 8. Decide Edit by Manager
    v_res := wl.wl_decide_edit(v_mgr_id, v_edit_id, 'approve', 'Approved extra 30 mins', 'WEB');
    IF NOT (v_res->>'ok')::boolean THEN RAISE EXCEPTION 'FAIL 8: Decide edit: %', v_res; END IF;

    RAISE NOTICE 'SUCCESS: FULL TIMESHEET LIFECYCLE PL/PGSQL TEST PASSED PERFECTLY.';
END $$;
