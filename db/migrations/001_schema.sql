-- Migration 001: Schema definition for WorkLog AI (PostgreSQL 16)
BEGIN;

CREATE SCHEMA IF NOT EXISTS wl;

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enum Types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role' AND typnamespace = 'wl'::regnamespace) THEN
        CREATE TYPE wl.role AS ENUM ('EMPLOYEE', 'MANAGER', 'HR_ADMIN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emp_status' AND typnamespace = 'wl'::regnamespace) THEN
        CREATE TYPE wl.emp_status AS ENUM ('ACTIVE', 'INACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rec_status' AND typnamespace = 'wl'::regnamespace) THEN
        CREATE TYPE wl.rec_status AS ENUM ('ACTIVE', 'ARCHIVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ts_status' AND typnamespace = 'wl'::regnamespace) THEN
        CREATE TYPE wl.ts_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel' AND typnamespace = 'wl'::regnamespace) THEN
        CREATE TYPE wl.channel AS ENUM ('WEB', 'TEAMS', 'API', 'SYSTEM');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_action' AND typnamespace = 'wl'::regnamespace) THEN
        CREATE TYPE wl.approval_action AS ENUM ('APPROVE', 'REJECT', 'REQUEST_CHANGES');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'edit_status' AND typnamespace = 'wl'::regnamespace) THEN
        CREATE TYPE wl.edit_status AS ENUM ('PENDING', 'APPROVED', 'DECLINED');
    END IF;
END $$;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION wl.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS wl.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entra_object_id VARCHAR(255) UNIQUE,
    email CITEXT UNIQUE NOT NULL,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role wl.role NOT NULL DEFAULT 'EMPLOYEE',
    department VARCHAR(100) NOT NULL,
    manager_id UUID REFERENCES wl.employees(id),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    status wl.emp_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_employees_timestamp BEFORE UPDATE ON wl.employees
FOR EACH ROW EXECUTE FUNCTION wl.update_timestamp();

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS wl.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status wl.rec_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_projects_timestamp BEFORE UPDATE ON wl.projects
FOR EACH ROW EXECUTE FUNCTION wl.update_timestamp();

-- 3. Activities Table
CREATE TABLE IF NOT EXISTS wl.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES wl.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status wl.rec_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_project_activity UNIQUE (project_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_project_lower_name ON wl.activities(project_id, lower(name));

CREATE TRIGGER set_activities_timestamp BEFORE UPDATE ON wl.activities
FOR EACH ROW EXECUTE FUNCTION wl.update_timestamp();

-- 4. Project Assignments Table
CREATE TABLE IF NOT EXISTS wl.project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES wl.employees(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES wl.projects(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_project UNIQUE (employee_id, project_id)
);

-- 5. Timesheets Table
CREATE TABLE IF NOT EXISTS wl.timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES wl.employees(id),
    project_id UUID NOT NULL REFERENCES wl.projects(id),
    activity_id UUID NOT NULL REFERENCES wl.activities(id),
    work_date DATE NOT NULL,
    hours NUMERIC(4,2) NOT NULL CHECK (hours > 0 AND hours <= 16 AND hours * 4 = floor(hours * 4)),
    task_description TEXT NOT NULL CHECK (length(task_description) >= 5 AND length(task_description) <= 1000),
    outcome TEXT,
    notes TEXT,
    status wl.ts_status NOT NULL DEFAULT 'DRAFT',
    current_version INT NOT NULL DEFAULT 1,
    source_channel wl.channel NOT NULL DEFAULT 'WEB',
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES wl.employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timesheets_emp_date ON wl.timesheets(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_proj_date ON wl.timesheets(project_id, work_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON wl.timesheets(status);

CREATE TRIGGER set_timesheets_timestamp BEFORE UPDATE ON wl.timesheets
FOR EACH ROW EXECUTE FUNCTION wl.update_timestamp();

-- 6. Timesheet Versions Table
CREATE TABLE IF NOT EXISTS wl.timesheet_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id UUID NOT NULL REFERENCES wl.timesheets(id) ON DELETE CASCADE,
    version INT NOT NULL,
    project_id UUID NOT NULL REFERENCES wl.projects(id),
    activity_id UUID NOT NULL REFERENCES wl.activities(id),
    work_date DATE NOT NULL,
    hours NUMERIC(4,2) NOT NULL,
    task_description TEXT NOT NULL,
    outcome TEXT,
    notes TEXT,
    status wl.ts_status NOT NULL,
    change_reason TEXT,
    created_by UUID NOT NULL REFERENCES wl.employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_timesheet_version UNIQUE (timesheet_id, version)
);

-- 7. Edit Requests Table
CREATE TABLE IF NOT EXISTS wl.edit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id UUID NOT NULL REFERENCES wl.timesheets(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES wl.employees(id),
    proposed_changes JSONB NOT NULL,
    reason TEXT NOT NULL,
    status wl.edit_status NOT NULL DEFAULT 'PENDING',
    decided_by UUID REFERENCES wl.employees(id),
    decided_at TIMESTAMPTZ,
    decision_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Approvals Table
CREATE TABLE IF NOT EXISTS wl.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id UUID NOT NULL REFERENCES wl.timesheets(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES wl.employees(id),
    action wl.approval_action NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Audit Log Table (Append-Only)
CREATE TABLE IF NOT EXISTS wl.audit_log (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL REFERENCES wl.employees(id),
    channel wl.channel NOT NULL DEFAULT 'SYSTEM',
    before JSONB,
    after JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION wl.block_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_log_append_only
BEFORE UPDATE OR DELETE ON wl.audit_log
FOR EACH ROW EXECUTE FUNCTION wl.block_audit_log_modification();

-- 10. Conversations Table
CREATE TABLE IF NOT EXISTS wl.conversations (
    employee_id UUID PRIMARY KEY REFERENCES wl.employees(id) ON DELETE CASCADE,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Conversation Messages Table
CREATE TABLE IF NOT EXISTS wl.conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES wl.employees(id) ON DELETE CASCADE,
    direction VARCHAR(5) NOT NULL CHECK (direction IN ('in', 'out')),
    channel wl.channel NOT NULL,
    masked_text TEXT,
    response JSONB NOT NULL,
    client_message_id UUID UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Leave Markers Table
CREATE TABLE IF NOT EXISTS wl.leave_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES wl.employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_emp_leave_date UNIQUE (employee_id, work_date)
);

-- 13. Org Settings Table (Single-Row Enforced)
CREATE TABLE IF NOT EXISTS wl.org_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    working_days INT[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5],
    reminder_time TIME NOT NULL DEFAULT '17:00:00',
    max_hours_per_day NUMERIC(4,2) NOT NULL DEFAULT 16.00,
    backdate_days INT NOT NULL DEFAULT 7,
    submit_mode VARCHAR(20) NOT NULL DEFAULT 'submit_on_confirm' CHECK (submit_mode IN ('submit_on_confirm', 'draft')),
    hour_aliases JSONB NOT NULL DEFAULT '{"half day": 4, "full day": 8}'::jsonb,
    sensitive_terms TEXT[] NOT NULL DEFAULT ARRAY['SecretProject', 'AcmeCorp'],
    low_confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.75,
    ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. Teams Conversation Refs Table
CREATE TABLE IF NOT EXISTS wl.teams_conversation_refs (
    employee_id UUID PRIMARY KEY REFERENCES wl.employees(id) ON DELETE CASCADE,
    service_url TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. Notifications Table
CREATE TABLE IF NOT EXISTS wl.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES wl.employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    delivered_teams_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. Reminder Log Table
CREATE TABLE IF NOT EXISTS wl.reminder_log (
    employee_id UUID NOT NULL REFERENCES wl.employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    count INT NOT NULL DEFAULT 1,
    snoozed_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (employee_id, work_date)
);

-- 17. Export Jobs Table
CREATE TABLE IF NOT EXISTS wl.export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES wl.employees(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    file_url TEXT,
    filters JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 18. Ops Errors Table (for Global Error Handler)
CREATE TABLE IF NOT EXISTS wl.ops_errors (
    id BIGSERIAL PRIMARY KEY,
    workflow VARCHAR(100) NOT NULL,
    node VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    execution_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 19. Eval Cases & Eval Runs Tables (for AI Evals)
CREATE TABLE IF NOT EXISTS wl.eval_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    today DATE NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    allowed_projects JSONB NOT NULL,
    pending_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wl.eval_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    prompt_version VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    metrics JSONB NOT NULL,
    failures JSONB NOT NULL
);

-- Application Security Role setup
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wl_app') THEN
        EXECUTE 'CREATE ROLE wl_app WITH LOGIN PASSWORD ''wl_app_password''';
    END IF;
END $$;

GRANT USAGE ON SCHEMA wl TO wl_app;
GRANT SELECT ON ALL TABLES IN SCHEMA wl TO wl_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA wl TO wl_app;

-- Grant Direct Mutation permissions ONLY on specific dynamic tables to wl_app
GRANT INSERT, UPDATE, DELETE ON wl.conversations TO wl_app;
GRANT INSERT, UPDATE, DELETE ON wl.conversation_messages TO wl_app;
GRANT INSERT, UPDATE, DELETE ON wl.notifications TO wl_app;
GRANT INSERT, UPDATE, DELETE ON wl.reminder_log TO wl_app;
GRANT INSERT, UPDATE, DELETE ON wl.teams_conversation_refs TO wl_app;
GRANT INSERT, UPDATE, DELETE ON wl.export_jobs TO wl_app;
GRANT INSERT ON wl.ops_errors TO wl_app;

COMMIT;
