# Auto-Deployment Integration Guide

## Quick Start: Adding Auto-Deploy to Your Project Dashboard

### Step 1: Import the Component

In your project dashboard page (e.g., `app/dashboard/projects/[id]/page.tsx`):

```tsx
import AutoDeployModal from '@/components/AutoDeployModal'
import { useState } from 'react'
```

### Step 2: Add State Management

```tsx
export default function ProjectPage({ params }) {
  const [showDeployModal, setShowDeployModal] = useState(false)
  
  // ... rest of your component
}
```

### Step 3: Add Deploy Button

```tsx
<button
  onClick={() => setShowDeployModal(true)}
  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors flex items-center gap-2"
>
  <Cloud className="w-5 h-5" />
  Deploy Full-Stack App
</button>
```

### Step 4: Add the Modal

```tsx
<AutoDeployModal
  isOpen={showDeployModal}
  onClose={() => setShowDeployModal(false)}
  projectId={project.id}
  projectName={project.name}
  hasDatabase={project.DatabaseConnection && project.DatabaseConnection.length > 0}
  databaseSchema={project.DatabaseConnection?.[0]?.DatabaseTable?.map(table => ({
    name: table.name,
    columns: table.schema, // Your schema structure
  })) || []}
/>
```

## Complete Example

Here's a complete example integrating auto-deploy into a project dashboard:

```tsx
'use client'

import { useState } from 'react'
import { Cloud, ExternalLink } from 'lucide-react'
import AutoDeployModal from '@/components/AutoDeployModal'

interface ProjectDashboardProps {
  project: {
    id: string
    name: string
    html: string
    css: string
    javascript: string
    publishedUrl?: string
    DatabaseConnection?: {
      id: string
      DatabaseTable: {
        id: string
        name: string
        schema: any
      }[]
    }[]
  }
}

export default function ProjectDashboard({ project }: ProjectDashboardProps) {
  const [showDeployModal, setShowDeployModal] = useState(false)

  const hasDatabase = project.DatabaseConnection && project.DatabaseConnection.length > 0

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {project.name}
        </h1>

        <div className="flex items-center gap-3">
          {/* Deploy Button */}
          <button
            onClick={() => setShowDeployModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors flex items-center gap-2"
          >
            <Cloud className="w-5 h-5" />
            Auto-Deploy
          </button>

          {/* View Live Site (if already deployed) */}
          {project.publishedUrl && (
            <a
              href={project.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              View Live
            </a>
          )}
        </div>
      </div>

      {/* Deployment Status Banner */}
      {project.publishedUrl && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-green-900 dark:text-green-100 font-medium">
              Deployed to production
            </span>
          </div>
          <a
            href={project.publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-700 dark:text-green-300 hover:underline mt-1 block"
          >
            {project.publishedUrl}
          </a>
        </div>
      )}

      {/* Rest of your dashboard content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your existing content */}
      </div>

      {/* Auto-Deploy Modal */}
      <AutoDeployModal
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        projectId={project.id}
        projectName={project.name}
        hasDatabase={hasDatabase}
        databaseSchema={
          hasDatabase
            ? project.DatabaseConnection[0].DatabaseTable.map((table) => ({
                name: table.name,
                columns: table.schema,
              }))
            : []
        }
      />
    </div>
  )
}
```

## Database Schema Format

The `databaseSchema` prop expects this format:

```typescript
[
  {
    name: 'users',
    columns: [
      {
        name: 'id',
        type: 'uuid',
        primaryKey: true,
        nullable: false,
        defaultValue: 'gen_random_uuid()',
      },
      {
        name: 'email',
        type: 'varchar(255)',
        nullable: false,
        unique: true,
      },
      {
        name: 'created_at',
        type: 'timestamp',
        nullable: false,
        defaultValue: 'now()',
      },
    ],
  },
  {
    name: 'posts',
    columns: [
      {
        name: 'id',
        type: 'uuid',
        primaryKey: true,
        nullable: false,
      },
      {
        name: 'title',
        type: 'text',
        nullable: false,
      },
      {
        name: 'content',
        type: 'text',
        nullable: true,
      },
      {
        name: 'user_id',
        type: 'uuid',
        nullable: false,
        // Foreign key handled by SQL generation
      },
    ],
  },
]
```

## OAuth Setup Instructions

### For Vercel Integration (Already Setup)

Vercel OAuth should already be configured. If not, follow these steps:

1. Go to [Vercel Integrations](https://vercel.com/dashboard/integrations)
2. Create a new OAuth integration
3. Set redirect URI: `https://yourdomain.com/api/integrations/vercel/callback`
4. Copy Client ID and Secret to `.env`:
   ```env
   VERCEL_CLIENT_ID=your_client_id
   VERCEL_CLIENT_SECRET=your_client_secret
   ```

### For Supabase Integration (New - Required)

1. **Create Supabase OAuth App:**
   - Contact Supabase support to request OAuth integration access
   - Or use the Supabase Management API with personal access token
   - Once approved, you'll receive:
     - Client ID
     - Client Secret
     - Authorized redirect URIs

2. **Configure Environment Variables:**
   ```env
   SUPABASE_CLIENT_ID=your_supabase_client_id
   SUPABASE_CLIENT_SECRET=your_supabase_client_secret
   SUPABASE_REDIRECT_URI=https://yourdomain.com/api/integrations/supabase/callback
   ```

3. **For Development:**
   ```env
   SUPABASE_REDIRECT_URI=http://localhost:3000/api/integrations/supabase/callback
   ```

**Note:** If Supabase OAuth is not available yet, you can use personal access tokens as an alternative:

```tsx
// Alternative: Use personal access token
// In your user settings, allow users to input their Supabase PAT
const supabaseToken = user.supabasePersonalAccessToken

// Then pass it directly to the provisioning function
await provisionSupabaseDatabase(projectName, schema, supabaseToken)
```

## Testing the Integration

### 1. Test OAuth Connections

```bash
# Start dev server
npm run dev

# Navigate to your dashboard
http://localhost:3000/dashboard/projects/[project-id]

# Click "Auto-Deploy"
# Click "Connect Vercel" (should redirect to Vercel)
# Click "Connect Supabase" (should redirect to Supabase)
```

### 2. Test Deployment

Once connections are established:

1. Click "Deploy Now"
2. Watch the progress indicators
3. Wait 3-5 minutes for deployment
4. Click "View Live Site" on success

### 3. Check Deployment Status

You can also check deployment status programmatically:

```typescript
const response = await fetch(`/api/deploy/auto?deploymentId=${deploymentId}`)
const data = await response.json()

console.log(data.deployment.status) // 'success' | 'failed' | 'deploying'
console.log(data.deployment.deploymentUrl) // https://your-app.vercel.app
```

## Error Handling

The system handles these errors automatically:

1. **No Vercel Connection:**
   - Shows "Connect Vercel" button
   - Blocks deployment until connected

2. **No Supabase Connection (if database needed):**
   - Shows "Connect Supabase" button
   - Blocks deployment until connected

3. **Deployment Fails:**
   - Shows error message
   - Provides "Try Again" button
   - Logs error details in deployment record

4. **Database Provisioning Fails:**
   - Rolls back deployment
   - Shows specific error
   - Allows retry

## Monitoring Deployments

### View All Deployments

```typescript
// Add to your project page
const deployments = await prisma.deployment.findMany({
  where: {
    projectId: project.id,
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 10,
})
```

### Deployment History Component

```tsx
function DeploymentHistory({ deployments }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Recent Deployments</h3>
      {deployments.map((deployment) => (
        <div key={deployment.id} className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className={`
              ${deployment.status === 'success' ? 'text-green-600' : ''}
              ${deployment.status === 'failed' ? 'text-red-600' : ''}
              ${deployment.status === 'deploying' ? 'text-blue-600' : ''}
            `}>
              {deployment.status}
            </span>
            <span className="text-sm text-gray-500">
              {new Date(deployment.createdAt).toLocaleString()}
            </span>
          </div>
          {deployment.deploymentUrl && (
            <a
              href={deployment.deploymentUrl}
              target="_blank"
              className="text-sm text-blue-600 hover:underline"
            >
              {deployment.deploymentUrl}
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
```

## Customization Options

### Custom Deploy Button Styles

```tsx
<button
  onClick={() => setShowDeployModal(true)}
  className="your-custom-classes"
>
  Your Custom Text
</button>
```

### Auto-Open on Project Creation

```tsx
useEffect(() => {
  // Auto-open deploy modal for new projects
  if (project.isNew && !project.publishedUrl) {
    setShowDeployModal(true)
  }
}, [project])
```

### Deployment Analytics

```tsx
// Track deployment events
useEffect(() => {
  if (deploymentStatus === 'success') {
    // Send analytics event
    analytics.track('deployment_success', {
      projectId: project.id,
      buildTime: deployment.buildTime,
      hasDatabase: hasDatabase,
    })
  }
}, [deploymentStatus])
```

## Troubleshooting

### "Please connect your Vercel account first"
- User needs to connect Vercel via OAuth
- Check that VERCEL_CLIENT_ID is set
- Verify redirect URI matches Vercel settings

### "Deployment failed" - Database provisioning
- Check Supabase API token is valid
- Verify schema format is correct
- Check Supabase quota limits

### "Deployment failed" - Vercel build
- Check generated code syntax
- Verify environment variables
- Review build logs in deployment record

### Modal doesn't show connection status
- Ensure API routes are accessible
- Check browser console for errors
- Verify user session is valid

## Next Steps

1. **Add to all project pages**
2. **Test with real projects**
3. **Set up OAuth credentials**
4. **Deploy to production**
5. **Monitor deployment success rates**
6. **Gather user feedback**
7. **Iterate on UX improvements**

## Support

For issues or questions:
- Check `AUTO_DEPLOYMENT_COMPLETE.md` for implementation details
- Review API route error logs
- Check Prisma Studio for deployment records
- Verify OAuth credentials in `.env`
