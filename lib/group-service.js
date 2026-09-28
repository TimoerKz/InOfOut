import { supabase } from './supabase';

export async function getOrCreateAnonymousSession() {
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

export async function getMyGroups() {
  if (!supabase) return [];
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];

  const { data, error } = await supabase
    .from('group_members')
    .select('role, groups (id, name, slug, timezone)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return [...new Map(data.map((membership) => [
    membership.groups.id,
    { ...membership.groups, role: membership.role },
  ])).values()];
}

export async function createGroup(groupName, displayName) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('create_group', {
    p_group_name: groupName,
    p_display_name: displayName,
  });
  if (error) throw error;
  return data;
}

export async function getGroupPreview(slugOrId) {
  if (!supabase || !slugOrId) return null;

  // Try RPC first (defined in migration 007)
  const { data, error } = await supabase.rpc('get_group_preview', {
    p_slug_or_id: slugOrId,
  });

  if (!error && Array.isArray(data) && data.length > 0) {
    return data[0];
  }

  // Fallback: If user is already a member, direct query works under RLS
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const query = supabase.from('groups').select('id, name, slug, timezone');
  const res = isUuid ? await query.eq('id', slugOrId).maybeSingle() : await query.eq('slug', slugOrId).maybeSingle();

  if (res.data) {
    return res.data;
  }

  return null;
}

export async function joinGroup(slugOrId, displayName) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('join_group', {
    p_slug_or_id: slugOrId,
    p_display_name: displayName,
  });

  if (error) {
    if (error.code === 'PGRST202') {
      throw new Error(
        'De uitnodigingsfunctie is nog niet geactiveerd in de database. Voer migratie 007_group_invites.sql uit in de Supabase SQL Editor.'
      );
    }
    throw error;
  }

  return data;
}
