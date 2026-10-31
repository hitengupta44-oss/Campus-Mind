# Step 1 — Supabase (deploy this first)

Supabase is the operational source of truth (grievances, assignments, audit log, agent events, knowledge candidates).
The backend talks to it with a normal Postgres connection (SQLAlchemy + psycopg), not the Supabase REST API.

## Do this
1. **Create a project** at supabase.com. Save the database password somewhere safe (you will need it once).
2. **SQL Editor → New query →** paste all of `schema.sql` → Run. (Creates 15 tables and enables Row Level Security
   on all of them with *no policies*, so the public `anon` key can read nothing. The backend connects as the
   database role, which bypasses RLS.)
3. *(Optional)* run `seed.sql` the same way. Skip it if you like: the backend seeds the same rows on its first boot.
4. Run `verify.sql`. Expect 15 tables, `rls_enabled = true` everywhere (seed: 10 departments, 5 users).
5. **Get the connection string:** click **Connect** (top bar) → **Session pooler** → copy the URI and put your DB
   password in place of `[YOUR-PASSWORD]`. It looks like
   `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.
   This is the value of the `DATABASE_URL` secret in step 2. Use the **Session pooler** (port 5432), not the "Direct
   connection": direct hosts are IPv6-only on many plans and Hugging Face may not reach them.
   If your password contains `@`, `:`, `/` or `#`, URL-encode it (`@` → `%40`).

## Keys you do NOT need
The Supabase `anon` / `service_role` keys and the project URL are not used by this app. Do not put them in the
frontend. The browser only ever talks to the backend API.

## Changing the schema later
`schema.sql` is generated from the SQLAlchemy models: `cd backend && python -m scripts.gen_schema > ../supabase/schema.sql`.
It uses `CREATE TABLE IF NOT EXISTS`, so re-running it never drops data but also does **not** alter existing tables.
For column changes write a new migration SQL by hand and run it in the SQL Editor.
