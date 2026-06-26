import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validator.js';

const router = express.Router();

// 1. Zod Validation Schema
const eventSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  start_time: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid start time.' }),
  end_time: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid end time.' }),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).default('Medium'),
  category: z.string().trim().max(50).optional().nullable(),
  location: z.string().trim().max(255).optional().nullable(),
  meeting_link: z.string().trim().url('Invalid URL format.').or(z.string().length(0)).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(['Active', 'Completed', 'Cancelled']).default('Active'),
  user_id: z.string().uuid().optional()
}).refine(data => new Date(data.start_time) <= new Date(data.end_time), {
  message: 'End time must be after or equal to start time.',
  path: ['end_time']
});

// 2. GET: List all events
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.user.id;
    const { data, error } = await req.supabase
      .from('events')
      .select('*')
      .eq('user_id', targetUserId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 3. POST: Create new event
router.post('/', requireAuth, validateBody(eventSchema), async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('events')
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

// 4. PUT: Update existing event
router.put('/:id', requireAuth, validateBody(eventSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatePayload = { ...req.validatedBody };
    delete updatePayload.user_id;

    const { data, error } = await req.supabase
      .from('events')
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

// 5. DELETE: Remove event
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('events')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Event not found or unauthorized.' });
    }
    
    res.json({ message: 'Event successfully deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
