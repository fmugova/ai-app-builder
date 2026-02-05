-- Check for projects with publicSlug but missing publish status
SELECT 
  id,
  name,
  "publicSlug",
  "isPublished",
  "publishedAt",
  "publicUrl",
  status,
  "updatedAt"
FROM "Project"
WHERE "publicSlug" IS NOT NULL
ORDER BY "updatedAt" DESC
LIMIT 20;

-- Fix projects that have publicSlug but aren't marked as published
UPDATE "Project"
SET 
  "isPublished" = true,
  "publishedAt" = COALESCE("publishedAt", "updatedAt"),
  status = 'PUBLISHED'
WHERE 
  "publicSlug" IS NOT NULL
  AND ("isPublished" = false OR "publishedAt" IS NULL);

-- Update publicUrl for projects using the old /app/ path
UPDATE "Project"
SET "publicUrl" = 'https://buildflow-ai.app/p/' || "publicSlug"
WHERE 
  "publicSlug" IS NOT NULL
  AND ("publicUrl" LIKE '%/app/%' OR "publicUrl" IS NULL);

-- Verify the specific slug mentioned by the user
SELECT 
  id,
  name,
  "publicSlug",
  "isPublished",
  "publishedAt",
  "publicUrl",
  status
FROM "Project"
WHERE "publicSlug" = 'mental-health-companion-app-ai-journaling-t-z3rF72-i';
