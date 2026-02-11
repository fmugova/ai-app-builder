-- Quick check for ProjectFile and ProjectVersion tables
SELECT 
  table_name,
  COUNT(column_name) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('Project', 'ProjectFile', 'ProjectVersion')
GROUP BY table_name
ORDER BY table_name;
