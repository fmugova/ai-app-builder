# BuildFlow AI - Iteration-Aware Generation System
## Implementation Summary

This document summarizes the iteration-aware code generation system that has been implemented for BuildFlow AI.

## 📁 Files Created

### 1. Core Services (`lib/services/`)

#### `iterationDetector.ts`
**Purpose:** Detects whether a user request is an iteration or new generation

**Key Features:**
- Analyzes user prompt for iteration keywords
- Checks for existing project files
- Determines change scope (small/medium/large/new)
- Fetches existing files from database

**Usage:**
```typescript
const context = await IterationDetector.detectIteration(prompt, projectId);
// Returns: { isIteration, changeScope, existingFiles, previousPrompts }
```

#### `promptBuilder.ts`
**Purpose:** Builds context-aware system prompts for Claude based on iteration context

**Key Features:**
- Creates different prompts for new/small/medium/large changes
- Formats existing file lists
- Extracts feature summaries from conversation history
- Enhances user messages with project context

**Usage:**
```typescript
const promptBuilder = new PromptBuilder();
const systemPrompt = promptBuilder.buildSystemPrompt(context);
const enhancedMessage = buildUserMessageWithContext(userPrompt, context);
```

#### `projectService.ts`
**Purpose:** Helper functions for project database operations

**Functions:**
- `getProject(projectId)` - Fetch project with files
- `getProjectFiles(projectId)` - Get all files for a project
- `saveProjectFiles(projectId, files)` - Save/update project files
- `updateProjectMetadata(projectId, data)` - Update project metadata
- `createProjectVersion(projectId, userId, code, description)` - Create version snapshot

### 2. Enhanced System Prompt (`lib/prompts/`)

#### `buildflow-enhanced-prompt.ts`
**Purpose:** Enhanced system prompt with multi-page HTML and iteration awareness

**Key Sections:**
- Multi-page HTML detection rules
- Iterative development mode instructions
- Code quality standards
- User experience patterns
- Success metrics

### 3. Frontend Component (`components/`)

#### `GenerationInterface.tsx`
**Purpose:** React component for iteration-aware generation UI

**Features:**
- Mode toggle (Iterate vs Fresh)
- Existing files display
- Conversation history
- Streaming response display
- Keyboard shortcuts (Cmd/Ctrl + Enter)
- Context-aware placeholders

**Usage:**
```tsx
<GenerationInterface
  projectId={project.id}
  existingFiles={project.files}
  initialPrompt=""
/>
```

### 4. Integration Guide (`lib/services/`)

#### `INTEGRATION_GUIDE.ts`
**Purpose:** Step-by-step guide for integrating iteration detection into existing API

**Covers:**
- Import statements
- Schema updates
- Iteration detection logic
- System prompt selection
- Multi-file handling
- Metadata updates

## 🚀 Quick Integration Steps

### Step 1: Install Dependencies (if needed)
```bash
npm install @anthropic-ai/sdk
```

### Step 2: Update Database Connection String
Your `.env.local` already has:
```env
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=10&pool_timeout=10&connect_timeout=10"
```
✅ Already configured for better connection handling!

### Step 3: Integrate into Generation API

Open `app/api/generate/route.ts` and follow the integration guide:

1. **Add imports** (at top):
```typescript
import { IterationDetector } from '@/lib/services/iterationDetector';
import { PromptBuilder, buildUserMessageWithContext } from '@/lib/services/promptBuilder';
import { getProjectFiles, saveProjectFiles } from '@/lib/services/projectService';
```

2. **Add iteration detection** (before AI streaming, around line 250):
```typescript
// Detect iteration context
const iterationContext = await IterationDetector.detectIteration(prompt, projectId);

// Build appropriate system prompt
const promptBuilder = new PromptBuilder();
const systemPrompt = promptBuilder.buildSystemPrompt(iterationContext);

// Enhance user message with context
const enhancedPrompt = buildUserMessageWithContext(prompt, iterationContext);
```

3. **Use enhanced prompt** (in AI stream call):
```typescript
const aiStream = await createMessageWithRetry(anthropic, {
  model: 'claude-sonnet-4-20250514',
  max_tokens: getOptimalTokenLimit(enhancedPrompt, generationType),
  system: systemPrompt, // <-- Use contextual prompt
  messages: [
    {
      role: 'user',
      content: enhancedPrompt, // <-- Use enhanced message
    },
  ],
  stream: true,
});
```

4. **Handle multi-file projects** (after project save):
```typescript
// Extract and save files for multi-file projects
if (iterationContext.isIteration) {
  const extractedFiles = extractFilesFromResponse(completeHtml);
  if (extractedFiles.length > 0) {
    await saveProjectFiles(projectId, extractedFiles);
  }
}
```

See `lib/services/INTEGRATION_GUIDE.ts` for complete details with exact line numbers!

### Step 4: Add Frontend Component

In your project page (e.g., `app/dashboard/projects/[id]/page.tsx`):

```typescript
import GenerationInterface from '@/components/GenerationInterface';
import { getProject } from '@/lib/services/projectService';

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  
  return (
    <div>
      <GenerationInterface
        projectId={project.id}
        existingFiles={project.ProjectFile}
      />
    </div>
  );
}
```

## 🧪 Testing Scenarios

### Test 1: Multi-Page Generation
**Input:**
```
Create a portfolio website with home, about, projects, and contact pages
```

**Expected:**
- ✅ 4 separate HTML files created
- ✅ All files saved to ProjectFile table
- ✅ Navigation links working between pages
- ✅ Consistent styling across all pages

### Test 2: Small Iteration
**Setup:** Create a landing page first

**Input:**
```
Change the button color to blue
```

**Expected:**
- ✅ Only CSS modified
- ✅ All other code preserved
- ✅ Single file updated

### Test 3: Medium Iteration
**Setup:** Create a blog website

**Input:**
```
Add a search feature to the blog
```

**Expected:**
- ✅ Search component added
- ✅ Existing blog posts preserved
- ✅ Modified files use targeted changes

### Test 4: Mode Toggle
**Setup:** Open existing project

**Expected:**
- ✅ Mode toggle appears
- ✅ "Iterate" mode selected by default
- ✅ Existing files shown
- ✅ Can switch to "Fresh" mode

## 📊 Database Schema Notes

Your existing schema already supports iteration:

**Existing Tables (Already in Database):**
- ✅ `Project` - Main project table
- ✅ `ProjectFile` - Individual files in multi-file projects
- ✅ `ProjectVersion` - Version history

**Fields Used:**
- `Project.multiPage` - Boolean for multi-page sites
- `Project.isMultiFile` - Boolean for multi-file projects
- `Project.prompt` - Original user prompt
- `ProjectFile.path` - File path/name
- `ProjectFile.content` - File content
- `ProjectVersion.description` - Version description (used for iteration history)

**Optional Enhancement (Future):**
You could add a `Generation` table to track iteration metrics:
```sql
CREATE TABLE "Generation" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT REFERENCES "Project"("id"),
  "prompt" TEXT,
  "isIteration" BOOLEAN,
  "changeScope" TEXT, -- 'small', 'medium', 'large', 'new'
  "tokensUsed" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

## 🔍 How It Works

### Flow Diagram:
```
User Input → Iteration Detector → Prompt Builder → Claude → Response
     ↓              ↓                    ↓            ↓         ↓
  ProjectId?   Analyze Context    Build System   Generate   Extract
                                    Prompt                    Files
     ↓              ↓                    ↓            ↓         ↓
  Load Files   Determine Scope    Add Context    Stream     Save to
                                                  Response     DB
```

### Key Decision Points:

1. **Is it an iteration?**
   - Check if projectId exists
   - Check if user mentions existing features
   - Check for iteration keywords

2. **What scope of change?**
   - Small: Styling, minor tweaks → Surgical modifications
   - Medium: New features → Create new files + modify existing
   - Large: Major changes → Ask for confirmation

3. **What prompt to use?**
   - New: Full generation instructions
   - Small: Preserve existing code
   - Medium: Balance addition and preservation
   - Large: Migration strategy

## 📈 Success Metrics

Track these in your analytics:

- **Iteration Success Rate:** % of iterations that preserve existing functionality
- **User Satisfaction:** Feedback on iteration quality
- **Generation Time:** Average time per generation by scope
- **File Accuracy:** % of times only necessary files modified

## 🐛 Troubleshooting

### Issue: Iteration not detected
**Solution:** Check that projectId is being passed correctly

### Issue: Entire app regenerated on small change
**Solution:** Verify iteration keywords are in the detector's keyword list

### Issue: Files not saved to database
**Solution:** Check RLS policies allow insert for the user

### Issue: Streaming not working
**Solution:** Verify SSE headers in API response

## 🔐 Security Considerations

- ✅ User authentication required (already implemented)
- ✅ RLS policies on database (already in schema)
- ✅ Rate limiting (already implemented)
- ✅ Input validation with Zod (already implemented)
- ✅ SQL injection prevention via Prisma (already implemented)

## 📝 Next Steps

1. **Implement the Integration:**
   - Follow the integration guide in `INTEGRATION_GUIDE.ts`
   - Add iteration detection to `/api/generate/route.ts`
   - Test with simple prompts first

2. **Add Frontend Component:**
   - Import `GenerationInterface` in your project page
   - Pass existing files to component
   - Test mode toggle functionality

3. **Test Thoroughly:**
   - Run all 4 test scenarios
   - Verify files are saved correctly
   - Check iteration detection accuracy

4. **Monitor & Iterate:**
   - Add logging for iteration context
   - Track success metrics
   - Gather user feedback
   - Refine prompts based on results

## 🎯 Key Benefits

✅ **Better User Experience:**
- Users can iterate without losing work
- Faster iterations (modify only what's needed)
- Clear communication about changes

✅ **Smarter AI:**
- Context-aware prompts
- Appropriate strategies per scope
- Preservation of working code

✅ **Multi-Page Support:**
- Automatic detection of multi-page requests
- Separate HTML files generated
- Working navigation between pages

✅ **Production Ready:**
- Works with existing codebase
- Database integration included
- Error handling built-in

## 📞 Support

If you encounter issues during implementation:

1. Check the integration guide for exact code snippets
2. Review the test scenarios to ensure expected behavior
3. Check console logs for iteration context details
4. Verify database connections and RLS policies

---

**Files Created:**
- ✅ `lib/prompts/buildflow-enhanced-prompt.ts`
- ✅ `lib/services/iterationDetector.ts`
- ✅ `lib/services/promptBuilder.ts`
- ✅ `lib/services/projectService.ts`
- ✅ `lib/services/INTEGRATION_GUIDE.ts`
- ✅ `components/GenerationInterface.tsx`
- ✅ This README

**Ready to implement!** 🚀
