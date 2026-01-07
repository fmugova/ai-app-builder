# Team/Workspace Feature Documentation

## Overview

The Team/Workspace feature allows users to collaborate on projects by creating workspaces and inviting team members. This feature supports role-based access control, project sharing, and team management.

## Database Models

### Workspace
The main workspace entity that groups users and projects together.

**Fields:**
- `id`: Unique identifier
- `name`: Workspace name
- `slug`: URL-friendly identifier (unique)
- `description`: Optional description
- `subscriptionTier`: Plan level (free, pro, enterprise)
- `subscriptionStatus`: Active, canceled, etc.
- `stripeCustomerId`: Stripe customer ID for billing
- `stripeSubscriptionId`: Stripe subscription ID
- `generationsUsed`: AI generations used this period
- `generationsLimit`: Max AI generations allowed
- `projectsLimit`: Max projects allowed
- `membersLimit`: Max team members allowed
- `createdAt`, `updatedAt`: Timestamps

### WorkspaceMember
Links users to workspaces with assigned roles.

**Fields:**
- `id`: Unique identifier
- `workspaceId`: Reference to workspace
- `userId`: Reference to user
- `role`: Member role (owner, admin, member)
- `joinedAt`: When the user joined
- `updatedAt`: Last update timestamp

**Roles:**
- **Owner**: Full control including deletion, billing, and role management
- **Admin**: Can manage members, invite users, and manage projects
- **Member**: Can view and edit shared projects

### WorkspaceInvite
Manages pending invitations to join a workspace.

**Fields:**
- `id`: Unique identifier
- `workspaceId`: Reference to workspace
- `email`: Email address of invitee
- `role`: Role to assign when accepted
- `token`: Unique invitation token
- `status`: pending, accepted, expired
- `invitedBy`: User who sent the invite
- `createdAt`: When invite was created
- `expiresAt`: When invite expires
- `acceptedAt`: When invite was accepted

### WorkspaceProject
Links projects to workspaces for team collaboration.

**Fields:**
- `id`: Unique identifier
- `workspaceId`: Reference to workspace
- `projectId`: Reference to project
- `permission`: view or edit
- `addedAt`: When project was added
- `addedBy`: User who added the project

## API Routes

### Workspace Management

#### `GET /api/workspaces`
Get all workspaces for the current user.

**Response:**
```json
{
  "workspaces": [
    {
      "id": "workspace_id",
      "name": "My Team",
      "slug": "my-team",
      "userRole": "owner",
      "memberCount": 5,
      "projectCount": 10
    }
  ]
}
```

#### `POST /api/workspaces`
Create a new workspace.

**Request:**
```json
{
  "name": "My Team",
  "slug": "my-team",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "workspace": {
    "id": "workspace_id",
    "name": "My Team",
    "slug": "my-team",
    "members": [...]
  }
}
```

#### `GET /api/workspaces/[id]`
Get workspace details including members and projects.

#### `PATCH /api/workspaces/[id]`
Update workspace details (admin/owner only).

**Request:**
```json
{
  "name": "Updated Name",
  "description": "New description"
}
```

#### `DELETE /api/workspaces/[id]`
Delete workspace (owner only).

### Member Management

#### `POST /api/workspaces/[id]/members/invite`
Invite a member to the workspace (admin/owner only).

**Request:**
```json
{
  "email": "user@example.com",
  "role": "member"
}
```

**Response:**
```json
{
  "invite": {
    "id": "invite_id",
    "email": "user@example.com",
    "role": "member",
    "status": "pending",
    "expiresAt": "2026-01-14T00:00:00Z"
  }
}
```

#### `GET /api/workspaces/invites/[token]`
Get invitation details by token.

#### `POST /api/workspaces/invites/[token]/accept`
Accept a workspace invitation.

#### `PATCH /api/workspaces/[workspaceId]/members/[memberId]`
Update member role (owner only).

**Request:**
```json
{
  "role": "admin"
}
```

#### `DELETE /api/workspaces/[workspaceId]/members/[memberId]`
Remove a member or leave workspace (admin/owner or self).

### Project Management

#### `GET /api/workspaces/[id]/projects`
Get all projects in a workspace.

#### `POST /api/workspaces/[id]/projects`
Add a project to the workspace (admin/owner only).

**Request:**
```json
{
  "projectId": "project_id",
  "permission": "edit"
}
```

## UI Components

### CreateWorkspaceDialog
A dialog component for creating new workspaces.

**Usage:**
```tsx
import { CreateWorkspaceDialog } from '@/components/CreateWorkspaceDialog';

<CreateWorkspaceDialog />
```

### InviteMemberDialog
A dialog for inviting team members to a workspace.

**Props:**
- `workspaceId`: The workspace ID
- `workspaceName`: The workspace name

**Usage:**
```tsx
import { InviteMemberDialog } from '@/components/InviteMemberDialog';

<InviteMemberDialog workspaceId={id} workspaceName={name} />
```

### WorkspaceMembersList
Displays and manages team members with role controls.

**Props:**
- `workspaceId`: The workspace ID
- `members`: Array of member objects
- `currentUserRole`: Current user's role
- `currentUserId`: Current user's ID

**Usage:**
```tsx
import { WorkspaceMembersList } from '@/components/WorkspaceMembersList';

<WorkspaceMembersList
  workspaceId={workspace.id}
  members={members}
  currentUserRole={userRole}
  currentUserId={userId}
/>
```

### WorkspaceSelector
A select component for choosing a workspace when creating projects.

**Props:**
- `value`: Selected workspace ID
- `onChange`: Callback when selection changes
- `disabled`: Whether the selector is disabled

**Usage:**
```tsx
import { WorkspaceSelector } from '@/components/WorkspaceSelector';

<WorkspaceSelector
  value={workspaceId}
  onChange={setWorkspaceId}
/>
```

## Pages

### `/workspaces`
Lists all workspaces the user belongs to with quick stats.

### `/workspaces/[id]`
Workspace detail page with tabs for:
- Team Members: View and manage team members
- Projects: Shared projects in the workspace
- Pending Invites: Invitations waiting to be accepted

### `/workspaces/accept-invite`
Landing page for accepting workspace invitations via email link.

## Utility Functions

Location: `lib/workspace.ts`

### `checkWorkspaceAccess(workspaceId, userId, requiredRole?)`
Check if a user has access to a workspace with an optional role requirement.

### `checkProjectAccessThroughWorkspace(projectId, userId)`
Check if a user can access a project through workspace membership.

### `getUserWorkspaces(userId)`
Get all workspaces a user belongs to.

### `canAddMember(workspaceId)`
Check if workspace has capacity for more members.

### `canAddProject(workspaceId)`
Check if workspace has capacity for more projects.

### `getWorkspaceUsage(workspaceId)`
Get detailed usage statistics for a workspace.

## Role Permissions

### Owner
- Full workspace control
- Delete workspace
- Manage billing/subscription
- Change member roles
- Invite/remove members
- Add/remove projects
- Edit workspace settings

### Admin
- Invite/remove members (except owners)
- Add/remove projects
- Edit workspace settings
- Cannot change roles
- Cannot delete workspace

### Member
- View workspace details
- View and edit shared projects (based on project permission)
- Leave workspace
- Cannot manage members or settings

## Subscription Tiers

Workspaces support different subscription tiers with varying limits:

### Free
- Members limit: 5
- Projects limit: 10
- Generations limit: 50

### Pro
- Members limit: 20
- Projects limit: 50
- Generations limit: 500

### Enterprise
- Custom limits
- Advanced features

## Email Notifications

When a user is invited to a workspace, they receive an email with:
- Workspace name and description
- Their assigned role
- Invitation link with token
- Expiration date (7 days from creation)

## Security Considerations

1. **Token-based invites**: Each invite has a unique token that expires after 7 days
2. **Email verification**: Invites are tied to specific email addresses
3. **Role hierarchy**: Enforced at the API level to prevent privilege escalation
4. **Owner protection**: Workspaces must have at least one owner
5. **Access control**: All API routes check workspace membership before allowing operations

## Migration

To apply the database schema changes:

```bash
npx prisma migrate dev --name add_workspace_feature
```

## Future Enhancements

Potential improvements for the workspace feature:

1. **Activity logs**: Track all workspace activities
2. **Audit trails**: Compliance and security monitoring
3. **Custom roles**: Define custom permission sets
4. **Project templates**: Share templates across workspace
5. **Team analytics**: Usage statistics and insights
6. **SSO integration**: Enterprise authentication
7. **Workspace settings**: Customizable preferences
8. **Notification preferences**: Control email and in-app notifications
9. **Workspace branding**: Custom logos and colors
10. **Advanced billing**: Per-seat pricing, usage-based billing
