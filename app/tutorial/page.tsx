import fs from 'fs'
import path from 'path'
import { marked } from 'marked'

export default async function TutorialPage() {
  // Read the tutorial markdown file from the project root
  const tutorialPath = path.join(process.cwd(), 'TUTORIAL_DOCUMENTATION.md')
  const markdown = fs.readFileSync(tutorialPath, 'utf-8')
  const html = marked.parse(markdown)

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">BuildFlow AI Tutorial</h1>
      <div className="prose prose-lg prose-blue dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
