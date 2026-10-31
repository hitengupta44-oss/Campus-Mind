-- Generated from backend/api/models.py. Paste into Supabase > SQL Editor and run ONCE.

CREATE TABLE IF NOT EXISTS audit_logs (
	id SERIAL NOT NULL, 
	actor VARCHAR(60) NOT NULL, 
	action VARCHAR(60) NOT NULL, 
	target_type VARCHAR(40) NOT NULL, 
	target_id VARCHAR(40) NOT NULL, 
	before_after JSONB NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS campus_locations (
	id SERIAL NOT NULL, 
	building VARCHAR(120) NOT NULL, 
	floor VARCHAR(20), 
	room VARCHAR(40), 
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS departments (
	id SERIAL NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	category VARCHAR(60) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS knowledge_candidates (
	id SERIAL NOT NULL, 
	content JSONB NOT NULL, 
	evidence JSONB NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS knowledge_provenance (
	id SERIAL NOT NULL, 
	candidate_id INTEGER NOT NULL, 
	source_case_refs JSONB NOT NULL, 
	source_memory_id VARCHAR(120), 
	destination_memory_id VARCHAR(120), 
	destination_datapack_id VARCHAR(80), 
	promotion_status VARCHAR(20) NOT NULL, 
	version INTEGER NOT NULL, 
	review_by TIMESTAMP WITH TIME ZONE, 
	supersedes_candidate_id INTEGER, 
	PRIMARY KEY (id), 
	UNIQUE (candidate_id), 
	FOREIGN KEY(candidate_id) REFERENCES knowledge_candidates (id), 
	FOREIGN KEY(supersedes_candidate_id) REFERENCES knowledge_candidates (id)
);

CREATE TABLE IF NOT EXISTS users (
	id SERIAL NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	department_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id)
);

CREATE TABLE IF NOT EXISTS grievances (
	id SERIAL NOT NULL, 
	public_ref VARCHAR(20) NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	description TEXT NOT NULL, 
	category VARCHAR(60), 
	priority VARCHAR(20), 
	status VARCHAR(30) NOT NULL, 
	location_id INTEGER, 
	student_id INTEGER NOT NULL, 
	idempotency_key VARCHAR(80), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_grievance_idem UNIQUE (student_id, idempotency_key), 
	UNIQUE (public_ref), 
	FOREIGN KEY(location_id) REFERENCES campus_locations (id), 
	FOREIGN KEY(student_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_grievances_status ON grievances (status);
CREATE INDEX IF NOT EXISTS ix_grievances_student_id ON grievances (student_id);
CREATE TABLE IF NOT EXISTS knowledge_approvals (
	id SERIAL NOT NULL, 
	candidate_id INTEGER NOT NULL, 
	reviewer_id INTEGER NOT NULL, 
	decision VARCHAR(10) NOT NULL, 
	rationale TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(candidate_id) REFERENCES knowledge_candidates (id), 
	FOREIGN KEY(reviewer_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS agent_runs (
	id SERIAL NOT NULL, 
	grievance_id INTEGER, 
	agent_name VARCHAR(40) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	started_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(grievance_id) REFERENCES grievances (id)
);

CREATE TABLE IF NOT EXISTS assignments (
	id SERIAL NOT NULL, 
	grievance_id INTEGER NOT NULL, 
	department_id INTEGER NOT NULL, 
	assigned_to INTEGER, 
	status VARCHAR(20) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(grievance_id) REFERENCES grievances (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_assignments_grievance_id ON assignments (grievance_id);
CREATE TABLE IF NOT EXISTS grievance_links (
	id SERIAL NOT NULL, 
	source_id INTEGER NOT NULL, 
	target_id INTEGER NOT NULL, 
	relationship_type VARCHAR(30) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(source_id) REFERENCES grievances (id), 
	FOREIGN KEY(target_id) REFERENCES grievances (id)
);

CREATE TABLE IF NOT EXISTS grievance_updates (
	id SERIAL NOT NULL, 
	grievance_id INTEGER NOT NULL, 
	actor_id INTEGER, 
	update_type VARCHAR(30) NOT NULL, 
	message TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(grievance_id) REFERENCES grievances (id), 
	FOREIGN KEY(actor_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_grievance_updates_grievance_id ON grievance_updates (grievance_id);
CREATE TABLE IF NOT EXISTS notifications (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	grievance_id INTEGER, 
	channel VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(grievance_id) REFERENCES grievances (id)
);

CREATE TABLE IF NOT EXISTS agent_events (
	id SERIAL NOT NULL, 
	run_id INTEGER, 
	event_type VARCHAR(40) NOT NULL, 
	sanitized_payload JSONB NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(run_id) REFERENCES agent_runs (id)
);

CREATE TABLE IF NOT EXISTS meko_call_logs (
	id SERIAL NOT NULL, 
	run_id INTEGER, 
	agent_id VARCHAR(40) NOT NULL, 
	operation VARCHAR(30) NOT NULL, 
	tool_name VARCHAR(80) NOT NULL, 
	datapack_id VARCHAR(80) NOT NULL, 
	success BOOLEAN NOT NULL, 
	error TEXT, 
	request_id VARCHAR(80), 
	latency_ms INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(run_id) REFERENCES agent_runs (id)
);


-- SECURITY: Supabase exposes every public table through its REST API. The backend connects with the
-- database role (bypasses RLS), so enable RLS with NO policies = the public anon/authenticated keys see nothing.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievance_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievance_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meko_call_logs ENABLE ROW LEVEL SECURITY;
