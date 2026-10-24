"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import {
  inviteAdmin, revokeInvite, setAdminRole, setAdminActive,
  createTeam, updateTeam, deleteTeam, addMember, removeMember,
} from "@/lib/teams";
import { createRole, updateRole, deleteRole } from "@/lib/rbac";

/**
 * Team, people and role management.
 *
 * Every action re-checks its permission on the server. The UI hides what you
 * can't do, but hiding a button is a courtesy — this is the enforcement.
 */

const err = (e: unknown) => (e instanceof Error ? e.message : "Action failed");

/* ---------------------------------------------------------------- people */

export async function inviteAction(input: {
  email: string; name?: string; role?: string; teamId?: string;
}) {
  const admin = await assertPermission("console.admins.manage");
  try {
    const result = await inviteAdmin({
      email: input.email,
      name: input.name,
      role: input.role,
      teamId: input.teamId || null,
      invitedBy: admin.email,
    });
    await logAction(admin, "team.invite", `${input.email} as ${input.role ?? "default"}`);
    revalidatePath("/team");
    return {
      ok: true as const,
      url: result.url,
      mail: result.mail.status,
      mailError: result.mail.error,
    };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function revokeInviteAction(id: string, email: string) {
  const admin = await assertPermission("console.admins.manage");
  try {
    await revokeInvite(id);
    await logAction(admin, "team.invite_revoke", email);
    revalidatePath("/team");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function setRoleAction(adminId: string, email: string, role: string) {
  const admin = await assertPermission("console.admins.manage");
  try {
    await setAdminRole(adminId, role);
    await logAction(admin, "team.set_role", `${email} → ${role}`);
    revalidatePath("/team");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function setActiveAction(adminId: string, email: string, active: boolean) {
  const admin = await assertPermission("console.admins.manage");
  try {
    await setAdminActive(adminId, active);
    await logAction(admin, active ? "team.reactivate" : "team.deactivate", email);
    revalidatePath("/team");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

/* ----------------------------------------------------------------- teams */

export async function createTeamAction(formData: FormData) {
  const admin = await assertPermission("console.teams.manage");
  const apps = String(formData.get("apps") ?? "").split(",").map((a) => a.trim()).filter(Boolean);

  await createTeam({
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    alertEmail: String(formData.get("alertEmail") ?? "") || null,
    apps,
  }, admin.email);

  await logAction(admin, "team.create", String(formData.get("slug")));
  revalidatePath("/team/teams");
}

export async function updateTeamAction(formData: FormData) {
  const admin = await assertPermission("console.teams.manage");
  const slug = String(formData.get("slug") ?? "");
  const apps = String(formData.get("apps") ?? "").split(",").map((a) => a.trim()).filter(Boolean);

  await updateTeam(slug, {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    alertEmail: String(formData.get("alertEmail") ?? "") || null,
    apps,
  });

  await logAction(admin, "team.update", slug);
  revalidatePath("/team/teams");
}

export async function deleteTeamAction(slug: string) {
  const admin = await assertPermission("console.teams.manage");
  try {
    await deleteTeam(slug);
    await logAction(admin, "team.delete", slug);
    revalidatePath("/team/teams");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function addMemberAction(teamId: string, adminId: string, role: string) {
  const admin = await assertPermission("console.teams.manage");
  try {
    await addMember(teamId, adminId, role);
    await logAction(admin, "team.add_member", `${adminId} → ${teamId}`);
    revalidatePath("/team/teams");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function removeMemberAction(teamId: string, adminId: string) {
  const admin = await assertPermission("console.teams.manage");
  try {
    await removeMember(teamId, adminId);
    await logAction(admin, "team.remove_member", `${adminId} ✕ ${teamId}`);
    revalidatePath("/team/teams");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

/* ----------------------------------------------------------------- roles */

export async function saveRoleAction(input: {
  slug: string;
  label: string;
  description?: string;
  permissions: string[];
  isDefault?: boolean;
  isNew: boolean;
}) {
  const admin = await assertPermission("console.roles.manage");
  try {
    if (input.isNew) {
      await createRole(input, admin.email);
      await logAction(admin, "role.create", `${input.slug} (${input.permissions.length} permissions)`);
    } else {
      await updateRole(input.slug, input);
      await logAction(admin, "role.update", `${input.slug} (${input.permissions.length} permissions)`);
    }
    revalidatePath("/team/roles");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function deleteRoleAction(slug: string) {
  const admin = await assertPermission("console.roles.manage");
  try {
    await deleteRole(slug);
    await logAction(admin, "role.delete", slug);
    revalidatePath("/team/roles");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}
