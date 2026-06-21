/* ===========================================================================
   EcoCycle — Auth: JWT + bcrypt + middleware
   =========================================================================== */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

const SECRET = process.env.JWT_SECRET || 'ecocycle-dev-secret-change-me';
const EXPIRES = '7d';

function signToken(user) { return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: EXPIRES }); }
function hashPassword(pw) { return bcrypt.hashSync(pw, 10); }
function checkPassword(pw, hash) { return hash ? bcrypt.compareSync(pw, hash) : false; }

/** Strip sensitive fields before sending a user to the client. */
function publicUser(u) {
  if (!u) return null;
  const { password_hash, ...safe } = u;
  return {
    ...safe,
    levelName: u.level_name,
    emailVerified: !!u.email_verified,
    phoneVerified: !!u.phone_verified,
  };
}

function auth(required = true) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) { if (required) return res.status(401).json({ error: 'Not authenticated' }); req.user = null; return next(); }
    try {
      const payload = jwt.verify(token, SECRET);
      const u = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
      if (!u) { if (required) return res.status(401).json({ error: 'User not found' }); req.user = null; return next(); }
      req.user = u;
      next();
    } catch (e) {
      if (required) return res.status(401).json({ error: 'Invalid or expired token' });
      req.user = null; next();
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { signToken, hashPassword, checkPassword, publicUser, auth, requireRole, SECRET };
