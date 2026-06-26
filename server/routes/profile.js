import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseService } from '../config/supabase.js';

const router = express.Router();

// 1. GET User Profile
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('profiles')
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 2. PUT Update User Profile
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const { full_name } = req.body;

    const { data, error } = await req.supabase
      .from('profiles')
      .update({ full_name, updated_at: new Date() })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 3. GET Export All Personal Data (Privacy compliance)
router.get('/export', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch all user information in parallel
    const [
      { data: profile },
      { data: events },
      { data: tasks },
      { data: goals },
      { data: projects },
      { data: notes }
    ] = await Promise.all([
      req.supabase.from('profiles').select('*').single(),
      req.supabase.from('events').select('*'),
      req.supabase.from('tasks').select('*'),
      req.supabase.from('goals').select('*'),
      req.supabase.from('projects').select('*'),
      req.supabase.from('notes').select('*')
    ]);

    const exportedData = {
      exported_at: new Date().toISOString(),
      user: {
        id: userId,
        email: req.user.email,
        profile
      },
      events: events || [],
      tasks: tasks || [],
      goals: goals || [],
      projects: projects || [],
      notes: notes || []
    };

    res.setHeader('Content-Disposition', 'attachment; filename=aegis_data_export.json');
    res.setHeader('Content-Type', 'application/json');
    res.json(exportedData);
  } catch (error) {
    next(error);
  }
});

// 4. DELETE Full Account Deletion (GDPR Right to Be Forgotten)
router.delete('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Supabase foreign key constraints set to ON DELETE CASCADE will handle wiping
    // all linked tables (events, tasks, goals, notes, projects, profiles)
    // when the user profile or user is deleted.
    // Let's verify and trigger the delete on the auth schema (requires service role client)
    const { error: authDeleteError } = await supabaseService.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      throw new Error(`Failed to delete authentication account: ${authDeleteError.message}`);
    }

    res.json({ message: 'Account and all associated data have been permanently deleted.' });
  } catch (error) {
    next(error);
  }
});

// 5. GET: List delegates and workspaces
router.get('/delegates', requireAuth, async (req, res, next) => {
  try {
    const { data: delegates, error: delError } = await supabaseService
      .from('workspace_members')
      .select('*, member:profiles!workspace_members_member_id_fkey(*)')
      .eq('owner_id', req.user.id);

    if (delError) throw delError;

    const { data: workspaces, error: wsError } = await supabaseService
      .from('workspace_members')
      .select('*, owner:profiles!workspace_members_owner_id_fkey(*)')
      .eq('member_id', req.user.id);

    if (wsError) throw wsError;

    res.json({ delegates: delegates || [], workspaces: workspaces || [] });
  } catch (error) {
    next(error);
  }
});

// 6. POST: Add a new delegate by email
router.post('/delegates', requireAuth, async (req, res, next) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required.' });
    }

    const { data: memberProfile, error: findError } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (findError || !memberProfile) {
      return res.status(404).json({ error: 'Operator profile not found.' });
    }

    if (memberProfile.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delegate access to yourself.' });
    }

    const { data, error } = await supabaseService
      .from('workspace_members')
      .insert([{
        owner_id: req.user.id,
        member_id: memberProfile.id,
        access_role: role
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'This user is already a delegate.' });
      }
      throw error;
    }

    res.status(201).json({ ...data, member: memberProfile });
  } catch (error) {
    next(error);
  }
});

// 7. DELETE: Revoke delegate access
router.delete('/delegates/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseService
      .from('workspace_members')
      .delete()
      .match({ id })
      .or(`owner_id.eq.${req.user.id},member_id.eq.${req.user.id}`)
      .select();

    if (error) throw error;
    res.json({ message: 'Access successfully revoked.', data });
  } catch (error) {
    next(error);
  }
});

export default router;
