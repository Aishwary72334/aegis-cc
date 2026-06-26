import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validator.js';

const router = express.Router();

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  status: z.string().trim().max(30).default('Active'),
  user_id: z.string().uuid().optional()
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.user.id;
    const { data, error } = await req.supabase
      .from('projects')
      .select('*')
      .eq('user_id', targetUserId)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, validateBody(projectSchema), async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('projects')
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

router.put('/:id', requireAuth, validateBody(projectSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatePayload = { ...req.validatedBody };
    delete updatePayload.user_id;

    const { data, error } = await req.supabase
      .from('projects')
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
      .from('projects')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Project not found or unauthorized.' });
    }
    res.json({ message: 'Project successfully deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
