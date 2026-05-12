import { supabaseAdmin } from './supabase.js';

export async function logActivity({
  entityType,
  entityId,
  action,
  userId,
  metadata = {},
}) {
  const { error } = await supabaseAdmin.from('activity_logs').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    user_id: userId,
    metadata,
  });
  if (error) console.error('activity_logs insert failed', error.message);
}
