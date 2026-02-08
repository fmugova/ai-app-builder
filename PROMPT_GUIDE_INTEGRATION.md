# Integrating PromptGuide Component

## Quick Integration Guide

### Step 1: Import the Component

In `app/chatbuilder/page.tsx`, add the import at the top:

```typescript
import PromptGuide from '@/components/PromptGuide';
```

### Step 2: Add the Component to the UI

Find where the prompt textarea is rendered (around line 800-900) and add the `PromptGuide` component nearby:

```tsx
{/* Add this above or below the textarea */}
<div className="mb-4">
  <PromptGuide 
    onSelectExample={(selectedPrompt) => {
      setPrompt(selectedPrompt);
    }} 
  />
</div>

{/* Your existing textarea */}
<textarea
  value={prompt}
  onChange={(e) => setPrompt(e.target.value)}
  // ... other props
/>
```

### Step 3: Test the Integration

1. **Open the chatbuilder page**
2. **Click "Prompt Guide" button** - Modal should open
3. **Browse examples** - Should see 6 examples
4. **Test search** - Type "coffee" to filter
5. **Test filters** - Click "Simple Website" and "Full-Stack App"
6. **Switch tabs** - Click "Best Practices" tab
7. **View a prompt** - Click "View Prompt" on any example
8. **Use a prompt** - Click "Use This Prompt"
   - Should fill the textarea
   - Should close the modal

### Alternative Placement Options

#### Option A: Next to Submit Button
```tsx
<div className="flex items-center gap-3">
  <PromptGuide onSelectExample={setPrompt} />
  <button type="submit" className="...">
    Generate
  </button>
</div>
```

#### Option B: In the Toolbar
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <PromptGuide onSelectExample={setPrompt} />
    {/* Other toolbar buttons */}
  </div>
</div>
```

#### Option C: Floating Button (Bottom Right)
```tsx
<div className="fixed bottom-8 right-8 z-40">
  <PromptGuide onSelectExample={setPrompt} />
</div>
```

### Customizing the Button Appearance

If you want to match your app's style, you can modify the button in `PromptGuide.tsx` (lines 362-370):

```tsx
// Current style:
<button
  onClick={() => setIsOpen(true)}
  className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
>
  <BookOpen className="h-4 w-4" />
  Prompt Guide
</button>

// Alternative purple style:
<button
  onClick={() => setIsOpen(true)}
  className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
>
  <BookOpen className="h-4 w-4" />
  Prompt Guide
</button>
```

### Expected User Flow

1. **User opens chatbuilder**
2. **User sees "Prompt Guide" button**
3. **User clicks button → Modal opens**
4. **User browses examples or best practices**
5. **User finds relevant example**
6. **User clicks "Use This Prompt"**
7. **Prompt textarea fills with example**
8. **Modal closes automatically**
9. **User customizes prompt (optional)**
10. **User clicks Generate**

### Benefits

- **Reduces blank-page syndrome** - Users don't start from scratch
- **Teaches by example** - Users learn what makes a good prompt
- **Improves quality** - Better prompts → better code → fewer errors
- **Saves time** - No need to write long prompts manually
- **Consistent results** - Examples follow proven patterns

### Testing Checklist

After integration:

- [ ] Button appears in chatbuilder
- [ ] Modal opens on click
- [ ] All 6 examples are visible
- [ ] Search works correctly
- [ ] Category filters work
- [ ] Tabs switch (Examples ↔ Best Practices)
- [ ] "View Prompt" expands prompt text
- [ ] "Use This Prompt" fills textarea
- [ ] "Use This Prompt" closes modal
- [ ] X button closes modal
- [ ] Modal is responsive on mobile
- [ ] No console errors

### Troubleshooting

**Modal doesn't open:**
- Check that `useState` is imported in chatbuilder
- Verify no z-index conflicts with other components

**Prompt doesn't fill textarea:**
- Ensure `setPrompt` function name matches your state variable
- Check that the callback is connected correctly

**Styling looks broken:**
- Verify Tailwind CSS is loaded
- Check that lucide-react icons are installed

**TypeScript errors:**
- Make sure the import path is correct
- Verify the component is exported as default

### Future Enhancements

Once integrated, you could add:

1. **Analytics** - Track which examples are most popular
2. **User Examples** - Let users save their own prompt templates
3. **Community Library** - Share prompts with other users
4. **AI-Generated Examples** - Generate examples based on user's past prompts
5. **Favorites** - Let users star examples
6. **Copy Button** - Copy prompt to clipboard instead of filling

---

**Ready to integrate!** The component is complete and error-free. Just add it to your chatbuilder page and test the user flow.
