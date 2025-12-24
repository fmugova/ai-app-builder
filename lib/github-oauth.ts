type GithubCredentials = {
  clientId: string
  clientSecret: string
}

export function getGithubOAuthCredentials(): GithubCredentials {
  const vercelEnv = process.env.VERCEL_ENV
  const nodeEnv = process.env.NODE_ENV
  const isProd = vercelEnv === 'production' || nodeEnv === 'production'

  const clientId = isProd
    ? process.env.GITHUB_CLIENT_ID_PROD ?? process.env.GITHUB_CLIENT_ID
    : process.env.GITHUB_CLIENT_ID_DEV ?? process.env.GITHUB_CLIENT_ID

  const clientSecret = isProd
    ? process.env.GITHUB_CLIENT_SECRET_PROD ?? process.env.GITHUB_CLIENT_SECRET
    : process.env.GITHUB_CLIENT_SECRET_DEV ?? process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    const scope = isProd ? 'production' : 'development'
    throw new Error(`Missing GitHub OAuth credentials for ${scope} environment`)
  }

  return { clientId, clientSecret }
}
