import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';
import { logActivity } from '../lib/activity.js';
import {
  canModifyMeeting,
  canManageDecision,
  canManageAction,
  canReadMeeting,
  canReadDecision,
  canReadAction,
  isAdmin,
} from '../lib/access.js';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const ALLOWED = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

async function assertWriteAttachment(profile, entity_type, entity_id) {
  if (isAdmin(profile)) return;
  if (entity_type === 'meeting') {
    const { data: m } = await supabaseAdmin.from('meetings').select('*').eq('id', entity_id).single();
    if (!m || !canModifyMeeting(profile, m)) throw httpError(403, 'Forbidden');
    return;
  }
  if (entity_type === 'decision') {
    const { data: d } = await supabaseAdmin.from('decisions').select('*').eq('id', entity_id).single();
    if (!d || !canManageDecision(profile, d)) throw httpError(403, 'Forbidden');
    return;
  }
  if (entity_type === 'action_item') {
    const { data: a } = await supabaseAdmin.from('action_items').select('*').eq('id', entity_id).single();
    const meetingsCache = new Map();
    const decisionsCache = new Map();
    if (a?.meeting_id) {
      const { data: m } = await supabaseAdmin.from('meetings').select('*').eq('id', a.meeting_id).single();
      if (m) meetingsCache.set(m.id, m);
    }
    if (a?.decision_id) {
      const { data: d } = await supabaseAdmin.from('decisions').select('*').eq('id', a.decision_id).single();
      if (d) decisionsCache.set(d.id, d);
    }
    if (!a || !canManageAction(profile, a, meetingsCache, decisionsCache)) throw httpError(403, 'Forbidden');
    return;
  }
  throw httpError(400, 'Invalid entity_type');
}

async function assertReadAttachment(profile, entity_type, entity_id) {
  if (isAdmin(profile)) return;
  if (entity_type === 'meeting') {
    const { data: m } = await supabaseAdmin.from('meetings').select('*').eq('id', entity_id).single();
    if (!m || !canReadMeeting(profile, m)) throw httpError(403, 'Forbidden');
    return;
  }
  if (entity_type === 'decision') {
    const { data: d } = await supabaseAdmin.from('decisions').select('*').eq('id', entity_id).single();
    if (!d || !canReadDecision(profile, d)) throw httpError(403, 'Forbidden');
    return;
  }
  if (entity_type === 'action_item') {
    const { data: a } = await supabaseAdmin.from('action_items').select('*').eq('id', entity_id).single();
    let meeting;
    let decision;
    if (a?.meeting_id) {
      const { data } = await supabaseAdmin.from('meetings').select('*').eq('id', a.meeting_id).maybeSingle();
      meeting = data;
    }
    if (a?.decision_id) {
      const { data } = await supabaseAdmin.from('decisions').select('*').eq('id', a.decision_id).maybeSingle();
      decision = data;
    }
    if (!a || !canReadAction(profile, a, meeting, decision)) throw httpError(403, 'Forbidden');
    return;
  }
  throw httpError(400, 'Invalid entity_type');
}

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const entity_type = req.body.entity_type;
    const entity_id = req.body.entity_id;
    if (!req.file) throw httpError(400, 'file is required');
    if (!entity_type || !entity_id) throw httpError(400, 'entity_type and entity_id are required');
    if (!ALLOWED.has(req.file.mimetype)) throw httpError(400, 'Unsupported file type');

    await assertWriteAttachment(req.profile, entity_type, entity_id);

    const safeName = req.file.originalname.replace(/[^\w.\-]+/g, '_');
    const path = `${entity_type}/${entity_id}/${randomUUID()}_${safeName}`;

    const { error: upErr } = await supabaseAdmin.storage.from('attachments').upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (upErr) throw httpError(400, upErr.message);

    const { data: row, error } = await supabaseAdmin
      .from('attachments')
      .insert({
        entity_type,
        entity_id,
        storage_path: path,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        uploaded_by: req.profile.id,
      })
      .select('*')
      .single();

    if (error) throw httpError(400, error.message);

    await logActivity({
      entityType: entity_type,
      entityId: entity_id,
      action: 'attachment_uploaded',
      userId: req.profile.id,
      metadata: { attachment_id: row.id },
    });

    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

router.get('/:id/download', async (req, res, next) => {
  try {
    const { data: att, error } = await supabaseAdmin.from('attachments').select('*').eq('id', req.params.id).single();
    if (error || !att) throw httpError(404, 'Attachment not found');

    await assertReadAttachment(req.profile, att.entity_type, att.entity_id);

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from('attachments')
      .createSignedUrl(att.storage_path, 120);

    if (signErr || !signed?.signedUrl) throw httpError(400, 'Could not sign URL');

    res.json({ url: signed.signedUrl, file_name: att.file_name });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { data: att, error } = await supabaseAdmin.from('attachments').select('*').eq('id', req.params.id).single();
    if (error || !att) throw httpError(404, 'Attachment not found');

    await assertWriteAttachment(req.profile, att.entity_type, att.entity_id);

    await supabaseAdmin.storage.from('attachments').remove([att.storage_path]);
    await supabaseAdmin.from('attachments').delete().eq('id', att.id);

    await logActivity({
      entityType: att.entity_type,
      entityId: att.entity_id,
      action: 'attachment_deleted',
      userId: req.profile.id,
    });

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
