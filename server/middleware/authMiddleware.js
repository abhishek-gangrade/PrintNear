import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET is required in production.');
}

export const getJwtSecret = () => process.env.JWT_SECRET || 'development-only-secret';

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = { id: decoded.id, role: decoded.role, name: decoded.name };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
};

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  // Admins are granted full access to protected role endpoints
  if (req.user.role === 'admin' || roles.includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: 'You do not have permission for this action.' });
};
