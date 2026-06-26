import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validator.js';

const router = express.Router();

const noteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(150),
  content: z.string().trim().max(10000).optional().nullable(),
  tags: z.array(z.string().trim().max(30)).default([]),
  project_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional()
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.user.id;
    const { data, error } = await req.supabase
      .from('notes')
      .select('*')
      .eq('user_id', targetUserId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, validateBody(noteSchema), async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('notes')
      .insert([{ 
        ...req.validatedBody, 
        user_id: req.validatedBody.user_id || req.user.id 
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAuth, validateBody(noteSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatePayload = { ...req.validatedBody };
    delete updatePayload.user_id;

    const { data, error } = await req.supabase
      .from('notes')
      .update({ 
        ...updatePayload, 
        updated_at: new Date() 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await req.supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized.' });
    }
    res.json({ message: 'Note successfully deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
