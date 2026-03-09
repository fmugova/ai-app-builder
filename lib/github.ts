import { Octokit } from '@octokit/rest'
import { decrypt } from '@/lib/encryption'

export function createOctokit(encryptedToken: string): Octokit {
  return new Octokit({ auth: decrypt(encryptedToken) })
}

export function slugifyRepoName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'buildflow-project'
}

export async function pushProjectToGitHub(
  octokit: Octokit,
  owner: string,
  repoSlug: string,
  files: Record<string, string>,
  isUpdate: boolean
): Promise<{ repoUrl: string; repoFullName: string }> {
  // Create repo on first push
  if (!isUpdate) {
    try {
      await octokit.repos.createForAuthenticatedUser({
        name: repoSlug,
        description: 'Generated with BuildFlow AI',
        auto_init: true,
        private: false,
      })
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 422) {
        throw new Error(
          `A repository named "${repoSlug}" already exists on your GitHub account. ` +
          `Rename the project and try again, or push an update if you already linked this project.`
        )
      }
      throw err
    }
    // Brief wait for GitHub to initialise the repo before we can read its ref
    await new Promise(r => setTimeout(r, 1500))
  }

  // Get default branch (main or master)
  const { data: repoData } = await octokit.repos.get({ owner, repo: repoSlug })
  const defaultBranch = repoData.default_branch

  // Get HEAD commit SHA
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo: repoSlug,
    ref: `heads/${defaultBranch}`,
  })
  const headSha = ref.object.sha

  // Get base tree SHA from HEAD commit
  const { data: headCommit } = await octokit.git.getCommit({
    owner,
    repo: repoSlug,
    commit_sha: headSha,
  })
  const baseTreeSha = headCommit.tree.sha

  // Create blobs for all files in parallel
  const blobs = await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo: repoSlug,
        content: Buffer.from(content).toString('base64'),
        encoding: 'base64',
      })
      return {
        path,
        sha: blob.sha,
        mode: '100644' as const,
        type: 'blob' as const,
      }
    })
  )

  // Create new tree on top of base
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo: repoSlug,
    base_tree: baseTreeSha,
    tree: blobs,
  })

  // Create commit
  const commitMessage = isUpdate
    ? 'Update from BuildFlow AI'
    : 'Initial commit from BuildFlow AI'

  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo: repoSlug,
    message: commitMessage,
    tree: newTree.sha,
    parents: [headSha],
  })

  // Update branch ref
  await octokit.git.updateRef({
    owner,
    repo: repoSlug,
    ref: `heads/${defaultBranch}`,
    sha: newCommit.sha,
  })

  return {
    repoUrl: `https://github.com/${owner}/${repoSlug}`,
    repoFullName: `${owner}/${repoSlug}`,
  }
}
