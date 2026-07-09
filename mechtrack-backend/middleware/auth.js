const { supabase } = require('../lib/supabase');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    
    // Validate JWT via Supabase API
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Get is_admin status from the mechanics table
    const { data: profile, error: dbError } = await supabase
      .from('mechanics')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      is_admin: profile ? profile.is_admin : false
    };

    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
