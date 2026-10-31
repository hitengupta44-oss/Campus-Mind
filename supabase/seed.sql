-- OPTIONAL. Seeds departments + DEMO personas (same data the backend seeds on first boot).
-- Idempotent: each statement inserts only if its table is empty. Run AFTER schema.sql.

INSERT INTO departments (name, category)
SELECT v.name, v.category
FROM (VALUES
  ('Hostel','hostel'), ('IT and Network','it'), ('Library','library'), ('Laboratories','lab'),
  ('Administration','admin'), ('Accounts','accounts'), ('Transport','transport'),
  ('Mess / Cafeteria','mess'), ('Safety','safety'), ('Infrastructure','infra')
) AS v(name, category)
WHERE NOT EXISTS (SELECT 1 FROM departments);

INSERT INTO users (name, role, department_id)
SELECT v.name, v.role, (SELECT id FROM departments WHERE category = v.dept)
FROM (VALUES
  ('DEMO Student A','student',NULL), ('DEMO Student B','student',NULL),
  ('DEMO IT Staff','staff','it'), ('DEMO Reviewer','reviewer','it'),
  ('DEMO Leadership','leadership',NULL)
) AS v(name, role, dept)
WHERE NOT EXISTS (SELECT 1 FROM users);
