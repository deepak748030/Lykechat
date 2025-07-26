import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const JWT_SECRET = process.env.ADMIN_SECRET_KEY || 'lykechat-admin-super-secret-2024';

export const generateAdminToken = (adminId) => {
  return jwt.sign({ adminId, type: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
};

export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'admin') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token type.' 
      });
    }

    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token. Admin not found or inactive.' 
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Invalid token.' 
    });
  }
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin.permissions.includes(permission) && req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};