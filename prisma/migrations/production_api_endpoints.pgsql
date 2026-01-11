-- Production Migration: API Endpoints & Backend Logic
-- Created: January 11, 2026
-- Purpose: Add ApiEndpoint and ApiTemplate models for Feature #10
-- Database: PostgreSQL (via Supabase)

-- ============================================================================
-- CREATE API ENDPOINT TABLE
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ApiEndpoint]') AND type in (N'U'))
CREATE TABLE "ApiEndpoint" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "code" TEXT NOT NULL,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "usesDatabase" BOOLEAN NOT NULL DEFAULT false,
    "databaseTable" TEXT,
    "requestSchema" JSONB,
    "responseSchema" JSONB,
    "tags" TEXT[],
    "rateLimit" INTEGER,
    "responseType" TEXT DEFAULT 'json',
    "statusCode" INTEGER DEFAULT 200,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "testsPassed" BOOLEAN DEFAULT false,
    "lastTested" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiEndpoint_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- CREATE API TEMPLATE TABLE
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ApiTemplate]') AND type in (N'U'))
CREATE TABLE "ApiTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "code" TEXT NOT NULL,
    "variables" TEXT[],
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "usesDatabase" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiTemplate_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Index for finding endpoints by project
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ApiEndpoint_projectId_idx' AND object_id = OBJECT_ID('ApiEndpoint'))
CREATE INDEX "ApiEndpoint_projectId_idx" ON "ApiEndpoint"("projectId");

-- Index for finding active endpoints
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ApiEndpoint_isActive_idx' AND object_id = OBJECT_ID('ApiEndpoint'))
CREATE INDEX "ApiEndpoint_isActive_idx" ON "ApiEndpoint"("isActive");

-- Index for finding endpoints by method
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ApiEndpoint_method_idx' AND object_id = OBJECT_ID('ApiEndpoint'))
CREATE INDEX "ApiEndpoint_method_idx" ON "ApiEndpoint"("method");

-- Index for finding templates by category
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ApiTemplate_category_idx' AND object_id = OBJECT_ID('ApiTemplate'))
CREATE INDEX "ApiTemplate_category_idx" ON "ApiTemplate"("category");

-- Index for finding public templates
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ApiTemplate_isPublic_idx' AND object_id = OBJECT_ID('ApiTemplate'))
CREATE INDEX "ApiTemplate_isPublic_idx" ON "ApiTemplate"("isPublic");

-- ============================================================================
-- CREATE UNIQUE CONSTRAINTS
-- ============================================================================

-- Ensure unique path+method combination per project
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ApiEndpoint_projectId_path_method_key' AND object_id = OBJECT_ID('ApiEndpoint'))
CREATE UNIQUE INDEX "ApiEndpoint_projectId_path_method_key" 
ON "ApiEndpoint"("projectId", "path", "method");

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Link ApiEndpoint to Project
ALTER TABLE "ApiEndpoint" 
ADD CONSTRAINT "ApiEndpoint_projectId_fkey" 
FOREIGN KEY ("projectId") 
REFERENCES "Project"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- ============================================================================
-- CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Trigger function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_api_endpoint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ApiEndpoint
DROP TRIGGER IF EXISTS update_api_endpoint_timestamp ON "ApiEndpoint";
CREATE TRIGGER update_api_endpoint_timestamp
BEFORE UPDATE ON "ApiEndpoint"
FOR EACH ROW
EXECUTE FUNCTION update_api_endpoint_updated_at();

-- Trigger for ApiTemplate
DROP TRIGGER IF EXISTS update_api_template_timestamp ON "ApiTemplate";
CREATE TRIGGER update_api_template_timestamp
BEFORE UPDATE ON "ApiTemplate"
FOR EACH ROW
EXECUTE FUNCTION update_api_endpoint_updated_at();

-- ============================================================================
-- INSERT DEFAULT TEMPLATES (Optional)
-- ============================================================================

-- Insert common API templates
INSERT INTO "ApiTemplate" ("id", "name", "description", "category", "method", "code", "variables", "requiresAuth", "usesDatabase", "tags", "isPublic")
VALUES
(
    'tpl_get_all_records',
    'Get All Records',
    'Fetch all records from a database table with pagination',
    'database',
    'GET',
    '// GET /api/{{tableName}}
import { NextRequest, NextResponse } from ''next/server''
import { prisma } from ''@/lib/prisma''

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get(''page'') || ''1'')
    const limit = parseInt(searchParams.get(''limit'') || ''10'')
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.{{tableName}}.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: ''desc'' }
      }),
      prisma.{{tableName}}.count()
    ])

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error(''Database error:'', error)
    return NextResponse.json(
      { success: false, error: ''Failed to fetch records'' },
      { status: 500 }
    )
  }
}',
    ARRAY['tableName'],
    false,
    true,
    ARRAY['database', 'crud', 'pagination'],
    true
),
(
    'tpl_create_record',
    'Create Record',
    'Create a new record in a database table',
    'database',
    'POST',
    '// POST /api/{{tableName}}
import { NextRequest, NextResponse } from ''next/server''
import { prisma } from ''@/lib/prisma''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.{{requiredField}}) {
      return NextResponse.json(
        { success: false, error: ''{{requiredField}} is required'' },
        { status: 400 }
      )
    }

    const record = await prisma.{{tableName}}.create({
      data: body
    })

    return NextResponse.json({
      success: true,
      data: record
    }, { status: 201 })
  } catch (error) {
    console.error(''Database error:'', error)
    return NextResponse.json(
      { success: false, error: ''Failed to create record'' },
      { status: 500 }
    )
  }
}',
    ARRAY['tableName', 'requiredField'],
    false,
    true,
    ARRAY['database', 'crud', 'create'],
    true
),
(
    'tpl_contact_form',
    'Contact Form Handler',
    'Process contact form submissions',
    'forms',
    'POST',
    '// POST /api/contact
import { NextRequest, NextResponse } from ''next/server''

interface ContactFormData {
  name: string
  email: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json()

    // Validate fields
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { success: false, error: ''All fields are required'' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: ''Invalid email format'' },
        { status: 400 }
      )
    }

    // TODO: Send email or save to database
    console.log(''Contact form submission:'', body)

    return NextResponse.json({
      success: true,
      message: ''Thank you for your message!''
    })
  } catch (error) {
    console.error(''Form error:'', error)
    return NextResponse.json(
      { success: false, error: ''Failed to process form'' },
      { status: 500 }
    )
  }
}',
    ARRAY[],
    false,
    false,
    ARRAY['forms', 'contact', 'validation'],
    true
)
ON CONFLICT ("id") DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count API endpoints
SELECT COUNT(*) as api_endpoints_count FROM "ApiEndpoint";

-- Count API templates
SELECT COUNT(*) as api_templates_count FROM "ApiTemplate";

-- Show template categories
SELECT category, COUNT(*) as count 
FROM "ApiTemplate" 
GROUP BY category 
ORDER BY count DESC;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- To rollback this migration, run:
/*
DROP TRIGGER IF EXISTS update_api_template_timestamp ON "ApiTemplate";
DROP TRIGGER IF EXISTS update_api_endpoint_timestamp ON "ApiEndpoint";
DROP FUNCTION IF EXISTS update_api_endpoint_updated_at();
ALTER TABLE "ApiEndpoint" DROP CONSTRAINT IF EXISTS "ApiEndpoint_projectId_fkey";
DROP INDEX IF EXISTS "ApiEndpoint_projectId_path_method_key";
DROP INDEX IF EXISTS "ApiTemplate_isPublic_idx";
DROP INDEX IF EXISTS "ApiTemplate_category_idx";
DROP INDEX IF EXISTS "ApiEndpoint_method_idx";
DROP INDEX IF EXISTS "ApiEndpoint_isActive_idx";
DROP INDEX IF EXISTS "ApiEndpoint_projectId_idx";
DROP TABLE IF EXISTS "ApiTemplate";
DROP TABLE IF EXISTS "ApiEndpoint";
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Migration completed successfully
-- Tables created: ApiEndpoint, ApiTemplate
-- Indexes created: 5
-- Constraints added: 2 (1 foreign key, 1 unique)
-- Triggers created: 2
-- Default templates inserted: 3

SELECT 'Migration completed successfully' as status;
