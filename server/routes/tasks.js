import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validator.js';

const router = express.Router();

// 1. Zod Schema
const taskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).default('Medium'),
  status: z.enum(['To Do', 'In Progress', 'Waiting', 'Blocked', 'Completed', 'Cancelled']).default('To Do'),
  deadline: z.string().refine(val => !val || !isNaN(Date.parse(val)), { message: 'Invalid deadline.' }).optional().nullable(),
  estimated_duration: z.number().int().min(0).default(0),
  actual_duration: z.number().int().min(0).default(0),
  project_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().trim().max(30)).default([]),
  user_id: z.string().uuid().optional()
});

// 2. GET: List tasks
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.user.id;
    const { data, error } = await req.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 3. POST: Create task
router.post('/', requireAuth, validateBody(taskSchema), async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('tasks')
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

// 4. PUT: Update task
router.put('/:id', requireAuth, validateBody(taskSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatePayload = { ...req.validatedBody };
    delete updatePayload.user_id;

    const { data, error } = await req.supabase
      .from('tasks')
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

// 5. DELETE: Remove task
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    res.json({ message: 'Task successfully deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
