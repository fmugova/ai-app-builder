# Workspace Feature - Setup Instructions

## Important Note

⚠️ You will see TypeScript errors until you complete steps 1-2. This is normal!

## 1. Database Migration

Run the Prisma migration to create the new tables:

```bash
npx prisma migrate dev --name add_workspace_feature
```

This will create:
- `Workspace` table
- `WorkspaceMember` table
- `WorkspaceInvite` table
- `WorkspaceProject` table

## 2. Generate Prisma Client

After migration, regenerate the Prisma client:

```bash
npx prisma generate
```

## 3. Environment Variables

Ensure you have the following environment variables set in your `.env` file:

```env
# Required for email invitations
NEXTAUTH_URL=http://localhost:3000  # or your production URL

# Email service (if not already configured)
# Add your email service credentials
```

## 4. Install Dependencies

The feature uses existing dependencies, but verify you have:

```bash
npm install
# or
pnpm install
# or
yarn install
```

## 5. Test the Feature

### Create a Workspace
1. Navigate to `/workspaces`
2. Click "Create Workspace"
3. Fill in the form and submit

### Invite Team Members
1. Go to your workspace detail page
2. Click "Invite Member"
3. Enter email and select role
4. The invitee will receive an email with an invitation link

### Accept Invitation
1. Click the link in the invitation email
2. Sign in (if not already)
3. Accept the invitation
4. You'll be redirected to the workspace

## 6. Navigation Update (Optional)

Add workspace link to your main navigation:

```tsx
// In your navigation component
<Link href="/workspaces">
  <Button variant="ghost">Workspaces</Button>
</Link>
```

## 7. Project Integration (Optional)

To allow users to select a workspace when creating projects, add the `WorkspaceSelector` component to your project creation form:

```tsx
import { WorkspaceSelector } from '@/components/WorkspaceSelector';

// In your project form
<WorkspaceSelector
  value={workspaceId}
  onChange={setWorkspaceId}
/>
```

Then, when creating a project, if a workspace is selected, also create a `WorkspaceProject` entry:

```tsx
// After creating the project
if (workspaceId) {
  await prisma.workspaceProject.create({
    data: {
      workspaceId,
      projectId: project.id,
      permission: 'edit',
      addedBy: userId,
    },
  });
}
```

## 8. Verify Installation

Check that all files were created:

### Database Schema
- ✅ `prisma/schema.prisma` (updated with new models)

### API Routes
- ✅ `app/api/workspaces/route.ts`
- ✅ `app/api/workspaces/[id]/route.ts`
- ✅ `app/api/workspaces/[id]/members/invite/route.ts`
- ✅ `app/api/workspaces/[id]/projects/route.ts`
- ✅ `app/api/workspaces/[workspaceId]/members/[memberId]/route.ts`
- ✅ `app/api/workspaces/invites/[token]/route.ts`

### Components
- ✅ `components/CreateWorkspaceDialog.tsx`
- ✅ `components/InviteMemberDialog.tsx`
- ✅ `components/WorkspaceMembersList.tsx`
- ✅ `components/WorkspaceSelector.tsx`

### Pages
- ✅ `app/workspaces/page.tsx`
- ✅ `app/workspaces/[id]/page.tsx`
- ✅ `app/workspaces/accept-invite/page.tsx`

### Utilities
- ✅ `lib/workspace.ts`

### Documentation
- ✅ `docs/workspace-feature.md`

## 9. Testing Checklist

- [ ] Create a workspace
- [ ] Invite a team member
- [ ] Accept invitation as invited user
- [ ] Update member role (as owner)
- [ ] Remove a member
- [ ] Leave a workspace (as member)
- [ ] Add project to workspace
- [ ] View workspace projects
- [ ] Update workspace details
- [ ] Delete workspace (as owner)

## 10. Production Deployment

Before deploying to production:

1. **Run migrations on production database:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Update email templates** with proper branding and production URLs

3. **Configure email service** for sending invitations

4. **Set up proper error monitoring** for workspace operations

5. **Test invite flow** with real email addresses

6. **Review and adjust limits** for different subscription tiers

## Troubleshooting

### Migration Fails
- Ensure your database connection is working
- Check for any existing tables with the same names
- Review the schema for syntax errors

### Invites Not Sending
- Verify email configuration in `.env`
- Check email service credentials
- Review email sending logs

### Permission Errors
- Ensure role checks are working correctly
- Verify user authentication is functioning
- Check workspace member relationships in database

## Support

For questions or issues, refer to:
- Full documentation: `docs/workspace-feature.md`
- Prisma schema: `prisma/schema.prisma`
- API documentation in the respective route files
