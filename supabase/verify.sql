-- Run in the SQL Editor after schema.sql (+ seed.sql) to confirm step 1 is done.
SELECT count(*) AS tables_expected_15
FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;   -- every row should be true

SELECT (SELECT count(*) FROM departments) AS departments,   -- 10 after seed
       (SELECT count(*) FROM users)        AS users;         -- 5 after seed
