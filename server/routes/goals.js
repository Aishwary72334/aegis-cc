import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validator.js';

const router = express.Router();

const goalSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  deadline: z.string().refine(val => !val || !isNaN(Date.parse(val)), { message: 'Invalid deadline.' }).optional().nullable(),
  progress: z.number().int().min(0).max(100).default(0),
  status: z.string().trim().max(30).default('Active'),
  notes: z.string().trim().max(2000).optional().nullable(),
  user_id: z.string().uuid().optional()
});

const milestoneSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  deadline: z.string().refine(val => !val || !isNaN(Date.parse(val)), { message: 'Invalid deadline.' }).optional().nullable(),
  progress: z.number().int().min(0).max(100).default(0),
  completed: z.boolean().default(false)
});

// 1. GET: Fetch all goals (with their milestones)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.user.id;
    const { data, error } = await req.supabase
      .from('goals')
      .select('*, milestones(*)')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 2. POST: Create a Goal
router.post('/', requireAuth, validateBody(goalSchema), async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('goals')
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

// 3. PUT: Update a Goal
router.put('/:id', requireAuth, validateBody(goalSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatePayload = { ...req.validatedBody };
    delete updatePayload.user_id;

    const { data, error } = await req.supabase
      .from('goals')
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

// 4. DELETE: Delete a Goal (ON DELETE CASCADE deletes milestones automatically)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await req.supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Goal not found or unauthorized.' });
    }
    res.json({ message: 'Goal successfully deleted.' });
  } catch (error) {
    next(error);
  }
});

// --- MILESTONE SUB-ROUTES ---

// 5. POST: Add Milestone to a Goal
router.post('/:goalId/milestones', requireAuth, validateBody(milestoneSchema), async (req, res, next) => {
  try {
    const { goalId } = req.params;

    // Verify ownership of the goal first (since RLS restricts CRUD, double check it exists for the user)
    const { data: goal, error: goalError } = await req.supabase
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .single();

    if (goalError || !goal) {
      return res.status(404).json({ error: 'Goal not found or unauthorized.' });
    }

    const { data, error } = await req.supabase
      .from('milestones')
      .insert([{ ...req.validatedBody, goal_id: goalId }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// 6. PUT: Update Milestone
router.put('/milestones/:milestoneId', requireAuth, validateBody(milestoneSchema), async (req, res, next) => {
  try {
    const { milestoneId } = req.params;

    const { data, error } = await req.supabase
      .from('milestones')
      .update({ ...req.validatedBody, updated_at: new Date() })
      .eq('id', milestoneId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 7. DELETE: Remove Milestone
router.delete('/milestones/:milestoneId', requireAuth, async (req, res, next) => {
  try {
    const { milestoneId } = req.params;
    const { data, error } = await req.supabase
      .from('milestones')
      .delete()
      .eq('id', milestoneId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Milestone not found or unauthorized.' });
    }
    res.json({ message: 'Milestone successfully deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
