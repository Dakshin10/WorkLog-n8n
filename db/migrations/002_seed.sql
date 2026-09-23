-- Migration 002: Seed Data and Automated Constraint Tests for WorkLog AI
BEGIN;

-- 1. Org Settings Default
INSERT INTO wl.org_settings (id, timezone, working_days, reminder_time, max_hours_per_day, backdate_days, submit_mode, hour_aliases, sensitive_terms, low_confidence_threshold, ai_enabled)
VALUES (
    1,
    'Asia/Kolkata',
    ARRAY[1, 2, 3, 4, 5],
    '17:00:00'::time,
    16.00,
    7,
    'submit_on_confirm',
    '{"half day": 4, "full day": 8}'::jsonb,
    ARRAY['SecretProject', 'AcmeCorp'],
    0.75,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 2. Projects Seed Data
INSERT INTO wl.projects (id, code, name, description, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'MSITE', 'Microsite', 'Microsite revamp and UX redesign project', 'ACTIVE'),
    ('22222222-2222-2222-2222-222222222222', 'CPORT', 'Client Portal', 'Client Portal backend API & QA testing', 'ACTIVE'),
    ('33333333-3333-3333-3333-333333333333', 'ITOOL', 'Internal Tools', 'Internal tooling and automation support', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

-- 3. Activities Seed Data
INSERT INTO wl.activities (id, project_id, name, description, status) VALUES
    ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'UX', 'User experience design & wireframing', 'ACTIVE'),
    ('a1111111-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', 'Backend', 'Microsite backend API development', 'ACTIVE'),
    ('a1111111-1111-1111-1111-333333333333', '11111111-1111-1111-1111-111111111111', 'Front End', 'Microsite frontend development', 'ACTIVE'),
    ('a1111111-1111-1111-1111-444444444444', '11111111-1111-1111-1111-111111111111', 'Client Meeting', 'Stakeholder & client review meetings', 'ACTIVE'),
    ('a2222222-2222-2222-2222-111111111111', '22222222-2222-2222-2222-222222222222', 'Backend', 'Portal REST services & API design', 'ACTIVE'),
    ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'QA', 'Integration & automated testing', 'ACTIVE'),
    ('a3333333-3333-3333-3333-111111111111', '33333333-3333-3333-3333-333333333333', 'Development', 'Tooling development & maintenance', 'ACTIVE'),
    ('a3333333-3333-3333-3333-222222222222', '33333333-3333-3333-3333-333333333333', 'Support', 'Internal developer support', 'ACTIVE')
ON CONFLICT (project_id, name) DO NOTHING;

-- 4. Seed Employees (1 HR Admin, 2 Managers, 17 Employees)
-- HR Admin
INSERT INTO wl.employees (id, entra_object_id, email, employee_code, name, role, department, manager_id, timezone, status) VALUES
    ('00000000-0000-0000-0000-000000000001', 'oid-hr-admin-1', 'hr.admin@example.com', 'EMP001', 'Sarah Jenkins (HR)', 'HR_ADMIN', 'Human Resources', NULL, 'Asia/Kolkata', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- Managers
INSERT INTO wl.employees (id, entra_object_id, email, employee_code, name, role, department, manager_id, timezone, status) VALUES
    ('00000000-0000-0000-0000-000000000002', 'oid-mgr-1', 'alex.manager@example.com', 'EMP002', 'Alex Vance (Manager)', 'MANAGER', 'Engineering', '00000000-0000-0000-0000-000000000001', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000003', 'oid-mgr-2', 'rachel.manager@example.com', 'EMP003', 'Rachel Green (Manager)', 'MANAGER', 'Design', '00000000-0000-0000-0000-000000000001', 'Asia/Kolkata', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- 17 Employees
INSERT INTO wl.employees (id, entra_object_id, email, employee_code, name, role, department, manager_id, timezone, status) VALUES
    ('00000000-0000-0000-0000-000000000010', 'oid-emp-10', 'dev1@example.com', 'EMP010', 'David Miller', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000011', 'oid-emp-11', 'dev2@example.com', 'EMP011', 'Emma Watson', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000012', 'oid-emp-12', 'dev3@example.com', 'EMP012', 'Frank Wright', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000013', 'oid-emp-13', 'dev4@example.com', 'EMP013', 'Grace Hopper', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000014', 'oid-emp-14', 'dev5@example.com', 'EMP014', 'Hank Pym', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000015', 'oid-emp-15', 'dev6@example.com', 'EMP015', 'Iris West', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000016', 'oid-emp-16', 'dev7@example.com', 'EMP016', 'Jack Ryan', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000017', 'oid-emp-17', 'dev8@example.com', 'EMP017', 'Kate Bishop', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000018', 'oid-emp-18', 'dev9@example.com', 'EMP018', 'Luke Cage', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000019', 'oid-emp-19', 'des1@example.com', 'EMP019', 'Mary Jane', 'EMPLOYEE', 'Design', '00000000-0000-0000-0000-000000000003', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000020', 'oid-emp-20', 'des2@example.com', 'EMP020', 'Nate Grey', 'EMPLOYEE', 'Design', '00000000-0000-0000-0000-000000000003', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000021', 'oid-emp-21', 'des3@example.com', 'EMP021', 'Olivia Wilde', 'EMPLOYEE', 'Design', '00000000-0000-0000-0000-000000000003', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000022', 'oid-emp-22', 'des4@example.com', 'EMP022', 'Peter Parker', 'EMPLOYEE', 'Design', '00000000-0000-0000-0000-000000000003', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000023', 'oid-emp-23', 'des5@example.com', 'EMP023', 'Quinn Fabray', 'EMPLOYEE', 'Design', '00000000-0000-0000-0000-000000000003', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000024', 'oid-emp-24', 'qa1@example.com', 'EMP024', 'Reed Richards', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000025', 'oid-emp-25', 'qa2@example.com', 'EMP025', 'Sue Storm', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000026', 'oid-emp-26', 'qa3@example.com', 'EMP026', 'Tony Stark', 'EMPLOYEE', 'Engineering', '00000000-0000-0000-0000-000000000002', 'Asia/Kolkata', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- 5. Seed Project Assignments
INSERT INTO wl.project_assignments (employee_id, project_id)
SELECT e.id, p.id
FROM wl.employees e, wl.projects p
WHERE e.email IN ('dev1@example.com', 'dev2@example.com', 'des1@example.com')
  AND p.code IN ('MSITE', 'CPORT')
ON CONFLICT (employee_id, project_id) DO NOTHING;

INSERT INTO wl.project_assignments (employee_id, project_id)
SELECT e.id, p.id
FROM wl.employees e, wl.projects p
WHERE e.email NOT IN ('dev1@example.com', 'dev2@example.com', 'des1@example.com')
  AND p.code = 'ITOOL'
ON CONFLICT (employee_id, project_id) DO NOTHING;

COMMIT;

-- 6. Automated SQL Tests (Plain SQL with DO blocks raising on failure)
DO $$
DECLARE
    v_test_ts_id UUID;
    v_error_caught BOOLEAN := FALSE;
BEGIN
    -- Test A: Hours Constraint (> 16 hours should fail)
    BEGIN
        INSERT INTO wl.timesheets (employee_id, project_id, activity_id, work_date, hours, task_description)
        VALUES (
            '00000000-0000-0000-0000-000000000010',
            '11111111-1111-1111-1111-111111111111',
            'a1111111-1111-1111-1111-111111111111',
            CURRENT_DATE,
            18.00,
            'Test invalid high hours'
        );
    EXCEPTION WHEN check_violation THEN
        v_error_caught := TRUE;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Hours constraint allowed 18 hours per day';
    END IF;

    -- Test B: Activity lower case uniqueness constraint
    v_error_caught := FALSE;
    BEGIN
        INSERT INTO wl.activities (project_id, name)
        VALUES ('11111111-1111-1111-1111-111111111111', 'ux');
    EXCEPTION WHEN unique_violation THEN
        v_error_caught := TRUE;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Activity lower case uniqueness constraint was ignored';
    END IF;

    -- Test C: Audit log immutability check
    v_error_caught := FALSE;
    BEGIN
        INSERT INTO wl.audit_log (id, entity_type, entity_id, action, actor_id, channel)
        VALUES (99999, 'TIMESHEET', gen_random_uuid(), 'CREATE', '00000000-0000-0000-0000-000000000001', 'SYSTEM');
        
        UPDATE wl.audit_log SET action = 'MUTATED' WHERE id = 99999;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Audit log row allowed UPDATE operation';
    END IF;

    RAISE NOTICE 'ALL SCHEMA & SEED CONSTRAINT TESTS PASSED SUCCESSFULLY.';
END $$;
