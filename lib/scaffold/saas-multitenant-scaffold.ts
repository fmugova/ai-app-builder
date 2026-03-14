// lib/scaffold/saas-multitenant-scaffold.ts
// Pre-built scaffold for SaaS / multi-tenant Next.js apps.
// Injected when selectScaffold() returns 'saas'.
// Provides: OrgSwitcher, MembersTable, InviteForm, PlanCard components
// + SQL migration for organizations / memberships / invitations tables.

import { getScaffoldFiles } from './nextjs-scaffold';

// ── Pre-built components ───────────────────────────────────────────────────────

const ORG_SWITCHER = `"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, Building2, Plus, Check } from "lucide-react";

interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export function OrgSwitcher({
  currentOrgId,
  onSwitch,
}: {
  currentOrgId?: string;
  onSwitch?: (org: Org) => void;
}) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("memberships")
        .select("role, organizations(id, name, slug)")
        .eq("user_id", user.id);
      if (!data) return;
      const mapped = data.map((m) => ({
        id: (m.organizations as Record<string, string>).id,
        name: (m.organizations as Record<string, string>).name,
        slug: (m.organizations as Record<string, string>).slug,
        role: m.role,
      }));
      setOrgs(mapped);
      setActiveOrg(
        mapped.find((o) => o.id === currentOrgId) ?? mapped[0] ?? null
      );
    }
    load();
  }, [currentOrgId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!activeOrg) return null;

  function handleSwitch(org: Org) {
    setActiveOrg(org);
    setOpen(false);
    onSwitch?.(org);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
      >
        <Building2 size={16} className="text-gray-500 shrink-0" />
        <span className="max-w-[140px] truncate">{activeOrg.name}</span>
        <ChevronDown size={14} className="text-gray-400 ml-1" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 py-1">
          <p className="text-xs text-gray-400 px-3 py-1.5 uppercase tracking-wide font-medium">
            Organizations
          </p>
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSwitch(org)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
            >
              <Building2 size={14} className="text-gray-400 shrink-0" />
              <span className="flex-1 truncate">{org.name}</span>
              {org.id === activeOrg.id && (
                <Check size={14} className="text-indigo-500 shrink-0" />
              )}
            </button>
          ))}
          <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                document
                  .getElementById("create-org-modal")
                  ?.removeAttribute("hidden");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-colors"
            >
              <Plus size={14} />
              Create organization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
`;

const MEMBERS_TABLE = `"use client";

import { createClient } from "@/lib/supabase/client";
import { Mail, Crown, Shield, User } from "lucide-react";
import { toast } from "sonner";

export interface Member {
  id: string;
  userId: string;
  email: string;
  name?: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

const ROLE_ICON: Record<string, React.ReactNode> = {
  owner: <Crown size={12} className="text-amber-500" />,
  admin: <Shield size={12} className="text-indigo-500" />,
  member: <User size={12} className="text-gray-400" />,
};
const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export function MembersTable({
  members,
  pendingInvites,
  currentUserId,
  currentUserRole,
  orgId,
  onRefresh,
}: {
  members: Member[];
  pendingInvites: PendingInvite[];
  currentUserId: string;
  currentUserRole: "owner" | "admin" | "member";
  orgId: string;
  onRefresh: () => void;
}) {
  const supabase = createClient();
  const canManage =
    currentUserRole === "owner" || currentUserRole === "admin";

  async function removeMember(userId: string) {
    const { error } = await supabase
      .from("memberships")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (error) {
      toast.error("Failed to remove member");
      return;
    }
    toast.success("Member removed");
    onRefresh();
  }

  async function changeRole(userId: string, newRole: "admin" | "member") {
    const { error } = await supabase
      .from("memberships")
      .update({ role: newRole })
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (error) {
      toast.error("Failed to update role");
      return;
    }
    toast.success("Role updated");
    onRefresh();
  }

  async function revokeInvite(inviteId: string) {
    const { error } = await supabase
      .from("invitations")
      .delete()
      .eq("id", inviteId);
    if (error) {
      toast.error("Failed to revoke invite");
      return;
    }
    toast.success("Invite revoked");
    onRefresh();
  }

  return (
    <div className="space-y-1">
      {members.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
            {(m.name ?? m.email)[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {m.name ?? m.email}
            </p>
            {m.name && (
              <p className="text-xs text-gray-400 truncate">{m.email}</p>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {ROLE_ICON[m.role]}
            {ROLE_LABEL[m.role]}
          </span>
          {canManage && m.role !== "owner" && m.userId !== currentUserId && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              {currentUserRole === "owner" && (
                <button
                  onClick={() =>
                    changeRole(
                      m.userId,
                      m.role === "admin" ? "member" : "admin"
                    )
                  }
                  className="text-xs px-2 py-1 rounded text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                >
                  {m.role === "admin" ? "Make member" : "Make admin"}
                </button>
              )}
              <button
                onClick={() => removeMember(m.userId)}
                className="text-xs px-2 py-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}

      {pendingInvites.length > 0 && (
        <>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium px-3 pt-3 pb-1">
            Pending invites
          </p>
          {pendingInvites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Mail size={14} className="text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {inv.email}
                </p>
                <p className="text-xs text-gray-400">
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                Pending
              </span>
              {canManage && (
                <button
                  onClick={() => revokeInvite(inv.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
`;

const INVITE_FORM = `"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function InviteForm({
  orgId,
  onInvited,
}: {
  orgId: string;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("invitations").insert({
        org_id: orgId,
        email: email.trim().toLowerCase(),
        role,
        invited_by: user?.id,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("This person is already invited");
        } else {
          toast.error("Failed to send invite");
        }
        return;
      }
      toast.success(\`Invite sent to \${email}\`);
      setEmail("");
      onInvited();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="colleague@company.com"
        className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        required
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "admin" | "member")}
        className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <UserPlus size={14} />
        )}
        Invite
      </button>
    </form>
  );
}
`;

const PLAN_CARD = `"use client";

import { Check, Zap, Shield, Building2 } from "lucide-react";

type PlanId = "free" | "pro" | "business";

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  description: string;
  features: string[];
  color: "gray" | "indigo" | "purple";
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "£0 / month",
    description: "For individuals and small experiments",
    features: [
      "Up to 3 team members",
      "5 GB storage",
      "Community support",
      "Basic analytics",
    ],
    color: "gray",
  },
  {
    id: "pro",
    name: "Pro",
    price: "£49 / month",
    description: "For growing teams that need more power",
    features: [
      "Up to 25 team members",
      "50 GB storage",
      "Priority support",
      "Advanced analytics",
      "Custom roles",
      "API access",
    ],
    color: "indigo",
  },
  {
    id: "business",
    name: "Business",
    price: "£149 / month",
    description: "For organisations with advanced needs",
    features: [
      "Unlimited team members",
      "500 GB storage",
      "Dedicated support",
      "Custom analytics",
      "SSO / SAML",
      "SLA guarantee",
      "Audit log",
    ],
    color: "purple",
  },
];

const COLORS = {
  gray: {
    ring: "ring-gray-200 dark:ring-gray-700",
    active: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
    btn: "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100",
    icon: "bg-gray-100 dark:bg-gray-800 text-gray-500",
  },
  indigo: {
    ring: "ring-indigo-500",
    active: "bg-indigo-600 text-white",
    btn: "bg-indigo-600 text-white hover:bg-indigo-700",
    icon: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300",
  },
  purple: {
    ring: "ring-purple-500",
    active: "bg-purple-600 text-white",
    btn: "bg-purple-600 text-white hover:bg-purple-700",
    icon: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300",
  },
};

const ICONS: Record<PlanId, React.ReactNode> = {
  free: <Zap size={16} />,
  pro: <Shield size={16} />,
  business: <Building2 size={16} />,
};

export function PlanCard({
  currentPlan,
  onUpgrade,
}: {
  currentPlan: PlanId;
  onUpgrade: (planId: PlanId) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {PLANS.map((plan) => {
        const isCurrent = plan.id === currentPlan;
        const c = COLORS[plan.color];
        return (
          <div
            key={plan.id}
            className={\`relative flex flex-col p-5 rounded-2xl border-2 transition-all \${
              isCurrent
                ? "ring-2 " + c.ring + " border-transparent"
                : "border-gray-100 dark:border-gray-800"
            }\`}
          >
            {isCurrent && (
              <span
                className={\`absolute -top-2.5 left-4 text-xs font-semibold px-2.5 py-0.5 rounded-full \${c.active}\`}
              >
                Current plan
              </span>
            )}
            <div className="flex items-center gap-2.5 mb-3">
              <span className={\`p-1.5 rounded-lg \${c.icon}\`}>
                {ICONS[plan.id]}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {plan.name}
                </h3>
                <p className="text-xs text-gray-400">{plan.price}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              {plan.description}
            </p>
            <ul className="flex-1 space-y-2 mb-5">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"
                >
                  <Check size={12} className="text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {isCurrent ? (
              <p className="text-center text-xs text-gray-400 py-2">Active</p>
            ) : (
              <button
                onClick={() => onUpgrade(plan.id)}
                className={\`w-full text-sm font-medium py-2 rounded-lg transition-colors \${c.btn}\`}
              >
                {plan.id === "free" ? "Downgrade" : "Upgrade to " + plan.name}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
`;

// ── SQL migration ──────────────────────────────────────────────────────────────

export const SAAS_MULTITENANT_MIGRATION = `-- ============================================================
-- SaaS Multi-tenant: organizations, memberships, invitations
-- ============================================================

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  slug         TEXT        NOT NULL UNIQUE,
  avatar_url   TEXT,
  plan         TEXT        NOT NULL DEFAULT 'free'
                           CHECK (plan IN ('free', 'pro', 'business')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Memberships  (user ↔ org with role)
CREATE TABLE IF NOT EXISTS memberships (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'member'
                         CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- Invitations  (pending email invites)
CREATE TABLE IF NOT EXISTS invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'member'
                          CHECK (role IN ('admin', 'member')),
  token       TEXT        NOT NULL UNIQUE
                          DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID        REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique pending invite per org+email
CREATE UNIQUE INDEX IF NOT EXISTS invitations_org_email_pending
  ON invitations (org_id, email)
  WHERE accepted_at IS NULL;

-- ── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations   ENABLE ROW LEVEL SECURITY;

-- organizations: visible to members
CREATE POLICY "org_members_select" ON organizations FOR SELECT USING (
  id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);
-- organizations: only owner can update
CREATE POLICY "org_owner_update" ON organizations FOR UPDATE USING (
  id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role = 'owner')
);
-- organizations: anyone can create (they become owner via function)
CREATE POLICY "org_insert_authenticated" ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- memberships: visible to org members
CREATE POLICY "membership_select" ON memberships FOR SELECT USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);
-- memberships: owner/admin can add members
CREATE POLICY "membership_insert" ON memberships FOR INSERT WITH CHECK (
  org_id IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);
-- memberships: owner/admin can remove others; any member can leave
CREATE POLICY "membership_delete" ON memberships FOR DELETE USING (
  user_id = auth.uid()
  OR org_id IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);
-- memberships: only owner can change roles
CREATE POLICY "membership_update" ON memberships FOR UPDATE USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role = 'owner')
);

-- invitations: visible to org members OR the invited email
CREATE POLICY "invitation_select" ON invitations FOR SELECT USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  OR email = (auth.jwt() ->> 'email')
);
-- invitations: owner/admin can insert
CREATE POLICY "invitation_insert" ON invitations FOR INSERT WITH CHECK (
  org_id IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);
-- invitations: owner/admin can revoke; invited user can accept (update accepted_at)
CREATE POLICY "invitation_update" ON invitations FOR UPDATE USING (
  email = (auth.jwt() ->> 'email')
  OR org_id IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);
CREATE POLICY "invitation_delete" ON invitations FOR DELETE USING (
  org_id IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- ── Helper functions ────────────────────────────────────────────────────────

-- Returns the first org_id for a user (owner orgs first)
CREATE OR REPLACE FUNCTION get_user_org(p_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT org_id
  FROM   memberships
  WHERE  user_id = p_user_id
  ORDER  BY (role = 'owner') DESC, created_at ASC
  LIMIT  1;
$$;

-- Creates an org and inserts the caller as owner atomically
CREATE OR REPLACE FUNCTION create_organization(p_name TEXT, p_slug TEXT)
RETURNS organizations LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org organizations;
BEGIN
  INSERT INTO organizations (name, slug)
  VALUES (p_name, p_slug)
  RETURNING * INTO v_org;

  INSERT INTO memberships (org_id, user_id, role)
  VALUES (v_org.id, auth.uid(), 'owner');

  RETURN v_org;
END;
$$;

-- Accepts an invitation: creates membership + marks invite accepted
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inv invitations;
BEGIN
  SELECT * INTO v_inv
  FROM   invitations
  WHERE  token = p_token
    AND  accepted_at IS NULL
    AND  expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or expired';
  END IF;

  INSERT INTO memberships (org_id, user_id, role)
  VALUES (v_inv.org_id, auth.uid(), v_inv.role)
  ON CONFLICT (org_id, user_id) DO NOTHING;

  UPDATE invitations SET accepted_at = NOW() WHERE id = v_inv.id;
END;
$$;

-- ── Seed data ───────────────────────────────────────────────────────────────

INSERT INTO organizations (id, name, slug, plan) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Acme Inc', 'acme-inc', 'pro')
ON CONFLICT DO NOTHING;
`;

// ── System prompt addon ────────────────────────────────────────────────────────

export const SAAS_MULTITENANT_SYSTEM_PROMPT_ADDON = `
════════════════════════════════════════════════════════════════════
🏢 SAAS MULTI-TENANT SCAFFOLD — ALWAYS APPLY FOR MULTI-TENANT APPS
════════════════════════════════════════════════════════════════════

Pre-built components are already in the scaffold — USE THEM:

\`\`\`
components/ui/org-switcher.tsx   → <OrgSwitcher currentOrgId={orgId} onSwitch={fn} />
components/ui/members-table.tsx  → <MembersTable members={…} pendingInvites={…} … />
components/ui/invite-form.tsx    → <InviteForm orgId={orgId} onInvited={refresh} />
components/ui/plan-card.tsx      → <PlanCard currentPlan="pro" onUpgrade={fn} />
\`\`\`

**Database schema (already in supabase/migrations/001_saas_multitenant.sql):**
- \`organizations\`   — id, name, slug, avatar_url, plan (free/pro/business), created_at
- \`memberships\`     — id, org_id, user_id, role (owner/admin/member), created_at
- \`invitations\`     — id, org_id, email, role, token, invited_by, accepted_at, expires_at

**Supabase helper functions:**
- \`create_organization(name, slug)\` → creates org + adds caller as owner
- \`get_user_org(user_id)\`           → returns user's primary org_id
- \`accept_invitation(token)\`        → accepts invite, creates membership

**MANDATORY patterns:**

1. Every query that touches app data MUST be scoped by \`org_id\`:
\`\`\`typescript
// Server Component — fetch org from membership
const { data: membership } = await supabase
  .from("memberships")
  .select("org_id, role, organizations(id, name, slug, plan)")
  .eq("user_id", user.id)
  .single();
const orgId = membership?.org_id;

// Then scope all queries:
const { data: items } = await supabase
  .from("your_table")
  .select("*")
  .eq("org_id", orgId);
\`\`\`

2. Team settings page at \`app/(app)/settings/team/page.tsx\`:
\`\`\`tsx
import { MembersTable } from "@/components/ui/members-table";
import { InviteForm } from "@/components/ui/invite-form";
// Load members + pending invites, pass currentUserId + currentUserRole
\`\`\`

3. Billing page at \`app/(app)/settings/billing/page.tsx\`:
\`\`\`tsx
import { PlanCard } from "@/components/ui/plan-card";
// Read org.plan, pass to PlanCard as currentPlan
// onUpgrade should call your Stripe route or update org.plan
\`\`\`

4. OrgSwitcher goes in the app sidebar or top-nav:
\`\`\`tsx
import { OrgSwitcher } from "@/components/ui/org-switcher";
<OrgSwitcher currentOrgId={orgId} onSwitch={(org) => router.push(\`/\${org.slug}/dashboard\`)} />
\`\`\`

5. New users arriving via invitation token: route \`app/invite/[token]/page.tsx\`
   calls \`accept_invitation(token)\` via a Server Action, then redirects to dashboard.

**Org-scoped URL structure (preferred):**
\`\`\`
/[orgSlug]/dashboard
/[orgSlug]/settings/team
/[orgSlug]/settings/billing
\`\`\`
OR flat with org stored in session/cookie — both patterns are acceptable.

**VISUAL STANDARDS for SaaS apps:**
- Neutral palette (slate/gray) with indigo accent — professional, not flashy
- Sidebar navigation with OrgSwitcher at the top
- Settings section with Team + Billing sub-pages
- Empty states with CTA when org has no data yet
`;

// ── Scaffold file assembly ─────────────────────────────────────────────────────

export function getSaasMultitenantScaffoldFiles(): Record<string, string> {
  return {
    ...getScaffoldFiles(),
    'components/ui/org-switcher.tsx':  ORG_SWITCHER,
    'components/ui/members-table.tsx': MEMBERS_TABLE,
    'components/ui/invite-form.tsx':   INVITE_FORM,
    'components/ui/plan-card.tsx':     PLAN_CARD,
    'supabase/migrations/001_saas_multitenant.sql': SAAS_MULTITENANT_MIGRATION,
  };
}
