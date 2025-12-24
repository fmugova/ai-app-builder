# GitHub Integration & Export Configuration

## Overview

BuildFlow provides seamless GitHub integration, allowing users to:
- Export generated projects directly to GitHub repositories
- Authenticate with their GitHub accounts securely
- Manage deployments from GitHub
- Version control their generated code

## Architecture

### Components

1. **GitHubIntegrationCard.tsx** - Minimal status card showing GitHub connection status
2. **GitHubConfigurationGuide.tsx** - Comprehensive setup and FAQ guide
3. **SimpleExportButton.tsx** - Export modal with GitHub option
4. **PreviewClient.tsx** - Export button in preview interface

### API Endpoints

#### `/api/user/github-status` (GET)
Check if user has connected their GitHub account.

**Response:**
```json
{
  "connected": true,
  "username": "fmugova"
}
```

#### `/api/github/create-repo` (POST)
Create a new GitHub repository and push generated code.

**Request:**
```json
{
  "projectName": "My Project",
  "description": "Generated with BuildFlow",
  "files": {
    "index.html": "...",
    "README.md": "...",
    "package.json": "..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "repositoryUrl": "https://github.com/username/my-project",
  "repositoryName": "my-project"
}
```

### Authentication Flow

1. **Initial Connection**: User clicks "Connect GitHub" button
   - Redirects to `/api/auth/github`
   - GitHub OAuth flow begins
   - User approves permissions on GitHub
   - Callback returns to app with auth code

2. **Token Storage**: GitHub access token is encrypted and stored in Prisma
   - Field: `User.githubAccessToken`
   - Field: `User.githubUsername`
   - Never exposed to client

3. **API Requests**: Token used server-side only
   - All repo creation happens on server
   - Client never sees the token
   - Secure HTTP-only cookies for session

## Environment Configuration

### Development Environment

```env
GITHUB_CLIENT_ID_DEV=your_dev_oauth_app_id
GITHUB_CLIENT_SECRET_DEV=your_dev_oauth_app_secret
```

### Production Environment

```env
GITHUB_CLIENT_ID_PROD=your_prod_oauth_app_id
GITHUB_CLIENT_SECRET_PROD=your_prod_oauth_app_secret
```

The app automatically selects credentials based on `VERCEL_ENV` or `NODE_ENV`.

## Setting Up GitHub OAuth Apps

### Create Development OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in details:
   - **Application Name**: BuildFlow Dev
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
4. Copy `Client ID` and `Client Secret` to `.env.local`

### Create Production OAuth App

1. Repeat steps above for production
2. Use production URLs:
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://yourdomain.com/api/auth/github/callback`
3. Add to Vercel environment variables:
   - `GITHUB_CLIENT_ID_PROD`
   - `GITHUB_CLIENT_SECRET_PROD`

### Callback URL Checklist

Ensure these callback URLs are configured exactly in your GitHub OAuth Apps:

- Development (local): `http://localhost:3000/api/auth/github/callback`
- Production (custom domain, apex): `https://buildflow-ai.app/api/auth/github/callback`
- Vercel preview/dev: `https://<your-project>.vercel.app/api/auth/github/callback`

Important notes:
- The callback URL must match exactly; GitHub rejects mismatches with “The redirect_uri is not associated with this application”.
- Do not include a trailing slash at the end of the callback path.
- Use the apex domain if your site resolves without `www` (e.g., `buildflow-ai.app`), or configure the OAuth App to use `www` consistently.
- Our OAuth requests do not override `redirect_uri` — GitHub will use the app’s configured callback.

## Repository Structure

When exporting a project, BuildFlow creates the following structure:

```
my-project/
├── index.html          # Generated code
├── package.json        # Dependencies
├── README.md           # Project documentation
├── .gitignore
└── LICENSE
```

## Security Considerations

✅ **Token Security**
- Tokens encrypted in database
- Never exposed to client-side code
- Server-only operations
- HTTP-only sessions

✅ **Permissions**
- Minimal scopes requested
- Only creates repos, doesn't read private data
- Users can revoke anytime

✅ **Code Safety**
- User-generated code is sanitized
- No eval or dynamic execution
- Static HTML/CSS/JS only

## Troubleshooting

### "GitHub not connected" error
**Solution**: Click "Connect GitHub" in preview/builder to authorize

### "Failed to create repository"
**Possible causes**:
- Repository name already exists
- GitHub API rate limited
- Invalid OAuth token
- Network connectivity

**Solution**: Try again or contact support

### Token expired
**Solution**: Disconnect and reconnect GitHub account to refresh token

### "Unauthorized" on export
**Causes**:
- Not logged in to BuildFlow
- GitHub connection lost
- Session expired

**Solution**: Log in and reconnect GitHub

## Future Enhancements

- [ ] Export to existing repositories
- [ ] Custom repository structure templates
- [ ] Automatic GitHub Pages deployment
- [ ] GitLab/Gitea support
- [ ] Bitbucket integration
- [ ] Repository branch management
- [ ] Automated PR creation from changes

## Related Documentation

- [Preview Page Guide](../../docs/PREVIEW.md)
- [Export Guide](../../docs/EXPORT.md)
- [API Reference](../../docs/API.md)
