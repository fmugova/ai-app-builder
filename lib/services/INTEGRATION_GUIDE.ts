/**
 * INTEGRATION GUIDE: Adding Iteration Detection to Generation API
 * 
 * This file shows the exact changes needed to integrate iteration-aware generation
 * into your existing /api/generate/route.ts
 * 
 * ✅ INTEGRATION COMPLETE! This guide shows what was integrated.
 * 
 * STEP 1: Add imports at the top of route.ts (after line 18)
 * 
 * Add these imports:
 * ```typescript
 * import { IterationDetector } from '@/lib/services/iterationDetector';
 * import { PromptBuilder, buildUserMessageWithContext } from '@/lib/services/promptBuilder';
 * import { saveProjectFiles, updateProjectMetadata } from '@/lib/services/projectService';
 * ```
 * 
 * STEP 2: Update the generateRequestSchema (around line 24)
 * Add previousPrompts field for conversation history
 * 
 * ```typescript
 * const generateRequestSchema = z.object({
 *   prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long'),
 *   projectId: z.string().optional(),
 *   generationType: z.string().max(50).optional(),
 *   retryAttempt: z.number().int().min(0).max(5).optional(),
 *   continuationContext: z.string().max(50000).optional(),
 *   // NEW: Add this line
 *   previousPrompts: z.array(z.string()).optional(),
 * });
 * ```
 * 
 * STEP 3: Inside the POST function, after line 250 (after validatedData)
 * Add iteration detection logic before streaming
 * 
 * ```typescript
 * // =========================================================================
 * // ITERATION DETECTION
 * // =========================================================================
 * console.log('🔍 Detecting iteration context...');
 * 
 * const iterationContext = await IterationDetector.detectIteration(
 *   prompt,
 *   projectId || undefined
 * );
 * 
 * console.log('📊 Iteration Context:', {
 *   isIteration: iterationContext.isIteration,
 *   changeScope: iterationContext.changeScope,
 *   existingFiles: iterationContext.existingFiles.length
 * });
 * 
 * // Build appropriate system prompt based on context
 * const promptBuilder = new PromptBuilder();
 * const systemPrompt = promptBuilder.buildSystemPrompt(iterationContext);
 * 
 * // Enhance user message with context if iterating
 * const enhancedPrompt = buildUserMessageWithContext(prompt, iterationContext);
 * 
 * console.log('💬 Using enhanced prompt strategy:', iterationContext.changeScope);
 * ```
 * 
 * STEP 4: Replace the existing system prompt selection (around line 280-310)
 * Currently it uses ENTERPRISE_SYSTEM_PROMPT or complexity-based detection
 * 
 * BEFORE (remove this):
 * ```typescript
 * const selectedSystemPrompt = complexityAnalysis.needsFullStack 
 *   ? FULLSTACK_SYSTEM_PROMPT 
 *   : ENTERPRISE_SYSTEM_PROMPT;
 * ```
 * 
 * AFTER (use this instead):
 * ```typescript
 * const selectedSystemPrompt = systemPrompt; // From PromptBuilder above
 * ```
 * 
 * STEP 5: Use enhancedPrompt instead of raw prompt in messages
 * Find where messages array is created (around line 320)
 * 
 * BEFORE (find and replace):
 * ```typescript
 * const aiStream = await createMessageWithRetry(anthropic, {
 *   model: 'claude-sonnet-4-20250514',
 *   max_tokens: getOptimalTokenLimit(prompt, generationType),
 *   system: selectedSystemPrompt,
 *   messages: [
 *     {
 *       role: 'user',
 *       content: prompt, // <-- OLD
 *     },
 *   ],
 *   stream: true,
 * });
 * ```
 * 
 * AFTER:
 * ```typescript
 * const aiStream = await createMessageWithRetry(anthropic, {
 *   model: 'claude-sonnet-4-20250514',
 *   max_tokens: getOptimalTokenLimit(enhancedPrompt, generationType), // Use enhanced
 *   system: selectedSystemPrompt, // Already using systemPrompt from Step 4
 *   messages: [
 *     {
 *       role: 'user',
 *       content: enhancedPrompt, // <-- NEW: Use enhanced prompt
 *     },
 *   ],
 *   stream: true,
 * });
 * ```
 * 
 * STEP 6: After project is saved (around line 580)
 * Add file extraction and storage for multi-file projects
 * 
 * ```typescript
 * // =========================================================================
 * // MULTI-FILE PROJECT HANDLING
 * // =========================================================================
 * if (iterationContext.isIteration || completeHtml.includes('<!-- File:') || completeHtml.includes('// File:')) {
 *   try {
 *     // Extract files from the generated code
 *     const fileMatches = Array.from(completeHtml.matchAll(/(?:\/\/\s*(?:File|Filename):\s*(.+)|<!--\s*File:\s*(.+?)\s*-->)([\s\S]*?)(?=(?:\/\/\s*(?:File|Filename):|<!--\s*File:)|$)/gi));
 *     
 *     const extractedFiles = [];
 *     for (const match of fileMatches) {
 *       const filename = match[1] || match[2];
 *       const content = match[3].trim();
 *       if (filename && content) {
 *         extractedFiles.push({
 *           path: filename.trim(),
 *           content: content
 *         });
 *       }
 *     }
 * 
 *     // If files were extracted, save them
 *     if (extractedFiles.length > 0) {
 *       console.log(`📁 Saving ${extractedFiles.length} files for project ${projectId}`);
 *       
 *       await saveProjectFiles(projectId, extractedFiles);
 *       
 *       await updateProjectMetadata(projectId, {
 *         multiPage: extractedFiles.length > 1,
 *         isMultiFile: true
 *       });
 * 
 *       console.log('✅ Multi-file project saved successfully');
 *     }
 *   } catch (fileError) {
 *     console.error('❌ Error saving project files:', fileError);
 *     // Don't fail the request
 *   }
 * }
 * ```
 * 
 * STEP 7: Update the completion event to include iteration info (Optional)
 * Find the completeEvent object (around line 625) and add iteration metadata
 * 
 * ```typescript
 * // Add iteration info to metadata:
 * metadata: {
 *   tokensUsed: inputTokens,
 *   generationTime,
 *   wasTruncated: !parsed.isComplete,
 *   stopReason: parsed.isComplete ? 'complete' : 'incomplete',
 *   // NEW: Add iteration metadata
 *   isIteration: iterationContext.isIteration,
 *   changeScope: iterationContext.changeScope,
 *   filesModified: iterationContext.existingFiles.length,
 * }
 * ```
 */


/**
 * RECAP OF CHANGES:
 * 
 * 1. ✅ Added imports for iteration services
 * 2. ✅ Updated schema to accept previousPrompts
 * 3. ✅ Added iteration detection before generation
 * 4. ✅ Use PromptBuilder to create context-aware system prompt
 * 5. ✅ Use enhanced prompt with context
 * 6. ✅ Extract and save multi-file projects
 * 7. ✅ Include iteration metadata in completion event (optional)
 * 
 * TESTING:
 * 
 * Test 1: New Project
 * POST /api/generate
 * {
 *   "prompt": "Create a portfolio website with home, about, projects pages"
 * }
 * Expected: Multiple HTML files generated
 * 
 * Test 2: Small Iteration
 * POST /api/generate
 * {
 *   "prompt": "Change the button color to blue",
 *   "projectId": "existing-project-id"
 * }
 * Expected: Only CSS modified, other files preserved
 * 
 * Test 3: Medium Iteration
 * POST /api/generate
 * {
 *   "prompt": "Add a contact form to the website",
 *   "projectId": "existing-project-id"
 * }
 * Expected: New contact.html created, navigation updated in other pages
 */

export {}; // Make this a module
