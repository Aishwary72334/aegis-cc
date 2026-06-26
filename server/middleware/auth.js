import { getRequestSupabaseClient } from '../config/supabase.js';

// 1. Authentication Middleware
// Verifies JWT with Supabase Auth and binds a request-scoped Supabase Client enforcing RLS
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied. Token is malformed.' });
    }

    // Initialize request-scoped Supabase Client
    const userSupabase = getRequestSupabaseClient(token);

    // Call Supabase auth to fetch user details (validates the JWT server-side)
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
    }

    // Fetch the user's profile details (including their RBAC role)
    const { data: profile } = await userSupabase
      .from('profiles')
      .select('*')
      .maybeSingle();

    // Attach authentication context to Express request
    req.user = user;
    req.profile = profile || { id: user.id, email: user.email, role: 'Owner' };
    req.supabase = userSupabase;

    next();
  } catch (error) {
    next(error);
  }
};

// 2. Role-Based Access Control (RBAC) Middleware
// Checks user role attached to request by requireAuth middleware
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.profile || !req.profile.role) {
      return res.status(403).json({ error: 'Access denied. User profile not loaded.' });
    }

    const hasRole = allowedRoles.includes(req.profile.role);
    if (!hasRole) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};
