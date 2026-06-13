import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import crypto from "crypto";

// Create a family group
export const createFamilyGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ name: z.string().min(1).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: group, error } = await context.supabase
      .from("family_groups")
      .insert({
        name: data.name,
        owner_id: context.user.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Add owner as member with "owner" role
    await context.supabase.from("family_members").insert({
      group_id: group.id,
      user_id: context.user.id,
      role: "owner",
    });

    return group;
  });

// List user's family groups
export const listFamilyGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("family_groups")
      .select(`
        *,
        family_members (
          id,
          user_id,
          role,
          joined_at,
          profiles (
            display_name
          )
        )
      `)
      .or(`owner_id.eq.${context.user.id},family_members.user_id.eq.${context.user.id}`);

    if (error) throw new Error(error.message);
    return data;
  });

// Get group details
export const getFamilyGroup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ groupId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: group, error } = await context.supabase
      .from("family_groups")
      .select(`
        *,
        family_members (
          id,
          user_id,
          role,
          joined_at,
          profiles (
            display_name
          )
        ),
        shared_weeks (
          id,
          week_id,
          shared_at,
          weeks (
            title,
            start_date
          ),
          profiles!shared_weeks_shared_by_id_fkey (
            display_name
          )
        )
      `)
      .eq("id", data.groupId)
      .single();

    if (error) throw new Error(error.message);
    return group;
  });

// Update group name
export const updateFamilyGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      groupId: z.string().uuid(),
      name: z.string().min(1).max(100),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: group, error: checkError } = await context.supabase
      .from("family_groups")
      .select("owner_id")
      .eq("id", data.groupId)
      .single();

    if (checkError || group?.owner_id !== context.user.id) {
      throw new Error("Not authorized");
    }

    const { error } = await context.supabase
      .from("family_groups")
      .update({ name: data.name })
      .eq("id", data.groupId);

    if (error) throw new Error(error.message);
  });

// Delete family group
export const deleteFamilyGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ groupId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: group, error: checkError } = await context.supabase
      .from("family_groups")
      .select("owner_id")
      .eq("id", data.groupId)
      .single();

    if (checkError || group?.owner_id !== context.user.id) {
      throw new Error("Not authorized");
    }

    const { error } = await context.supabase
      .from("family_groups")
      .delete()
      .eq("id", data.groupId);

    if (error) throw new Error(error.message);
  });

// Generate invitation code
export const generateInvitationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      groupId: z.string().uuid(),
      expiresInDays: z.number().int().positive().default(7),
      maxUses: z.number().int().positive().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: group, error: checkError } = await context.supabase
      .from("family_groups")
      .select("owner_id")
      .eq("id", data.groupId)
      .single();

    if (checkError || group?.owner_id !== context.user.id) {
      throw new Error("Not authorized");
    }

    const code = crypto.randomBytes(12).toString("hex");
    const expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);

    const { data: inviteCode, error } = await context.supabase
      .from("invitation_codes")
      .insert({
        group_id: data.groupId,
        code,
        created_by: context.user.id,
        expires_at: expiresAt.toISOString(),
        max_uses: data.maxUses,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return inviteCode;
  });

// Accept invitation code
export const acceptInvitationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    // Get invitation
    const { data: invite, error: inviteError } = await context.supabase
      .from("invitation_codes")
      .select("*")
      .eq("code", data.code)
      .single();

    if (inviteError || !invite) {
      throw new Error("Invalid invitation code");
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      throw new Error("Invitation code has expired");
    }

    // Check max uses
    if (invite.max_uses && invite.used_count >= invite.max_uses) {
      throw new Error("Invitation code has reached max uses");
    }

    // Check if already a member
    const { data: existing } = await context.supabase
      .from("family_members")
      .select("id")
      .eq("group_id", invite.group_id)
      .eq("user_id", context.user.id)
      .single();

    if (existing) {
      throw new Error("You are already a member of this group");
    }

    // Add user to group
    const { error: insertError } = await context.supabase
      .from("family_members")
      .insert({
        group_id: invite.group_id,
        user_id: context.user.id,
        role: "member",
      });

    if (insertError) throw new Error(insertError.message);

    // Increment used count
    await context.supabase
      .from("invitation_codes")
      .update({ used_count: invite.used_count + 1 })
      .eq("id", invite.id);

    // Return the group
    const { data: group, error: groupError } = await context.supabase
      .from("family_groups")
      .select("*")
      .eq("id", invite.group_id)
      .single();

    if (groupError) throw new Error(groupError.message);
    return group;
  });

// Share week with group
export const shareWeekWithGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      weekId: z.string().uuid(),
      groupId: z.string().uuid(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    // Verify week ownership
    const { data: week, error: weekError } = await context.supabase
      .from("weeks")
      .select("user_id")
      .eq("id", data.weekId)
      .single();

    if (weekError || week?.user_id !== context.user.id) {
      throw new Error("You don't own this week");
    }

    // Verify group ownership
    const { data: group, error: groupError } = await context.supabase
      .from("family_groups")
      .select("id")
      .eq("id", data.groupId)
      .eq("owner_id", context.user.id)
      .single();

    if (groupError || !group) {
      throw new Error("You don't own this group");
    }

    // Share
    const { error } = await context.supabase
      .from("shared_weeks")
      .insert({
        week_id: data.weekId,
        group_id: data.groupId,
        shared_by_id: context.user.id,
      });

    if (error) {
      if (error.code === "23505") {
        throw new Error("Week is already shared with this group");
      }
      throw new Error(error.message);
    }
  });

// Unshare week from group
export const unshareWeekFromGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      weekId: z.string().uuid(),
      groupId: z.string().uuid(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    // Verify week ownership
    const { data: week, error: weekError } = await context.supabase
      .from("weeks")
      .select("user_id")
      .eq("id", data.weekId)
      .single();

    if (weekError || week?.user_id !== context.user.id) {
      throw new Error("You don't own this week");
    }

    const { error } = await context.supabase
      .from("shared_weeks")
      .delete()
      .eq("week_id", data.weekId)
      .eq("group_id", data.groupId);

    if (error) throw new Error(error.message);
  });

// List shared weeks for a user (from all their groups)
export const listSharedWeeks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shared_weeks")
      .select(`
        id,
        week_id,
        group_id,
        shared_at,
        weeks (
          id,
          title,
          start_date,
          user_id,
          profiles!weeks_user_id_fkey (
            display_name
          )
        ),
        family_groups (
          name
        )
      `)
      .eq("family_members.user_id", context.user.id);

    if (error) throw new Error(error.message);
    return data;
  });

// Remove member from group
export const removeMemberFromGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      groupId: z.string().uuid(),
      memberId: z.string().uuid(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: group, error: checkError } = await context.supabase
      .from("family_groups")
      .select("owner_id")
      .eq("id", data.groupId)
      .single();

    if (checkError || group?.owner_id !== context.user.id) {
      throw new Error("Not authorized");
    }

    const { error } = await context.supabase
      .from("family_members")
      .delete()
      .eq("group_id", data.groupId)
      .eq("user_id", data.memberId);

    if (error) throw new Error(error.message);
  });

// Update member role
export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      groupId: z.string().uuid(),
      memberId: z.string().uuid(),
      role: z.enum(["editor", "viewer"]),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: group, error: checkError } = await context.supabase
      .from("family_groups")
      .select("owner_id")
      .eq("id", data.groupId)
      .single();

    if (checkError || group?.owner_id !== context.user.id) {
      throw new Error("Not authorized");
    }

    const { error } = await context.supabase
      .from("family_members")
      .update({ role: data.role })
      .eq("group_id", data.groupId)
      .eq("user_id", data.memberId);

    if (error) throw new Error(error.message);
  });
