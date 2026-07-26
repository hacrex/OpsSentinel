const logger = require('./logger');

// Role definitions with permissions
const ROLES = {
  viewer: {
    name: 'Viewer',
    permissions: [
      'events:read',
      'repos:read',
      'settings:read',
      'audit_logs:read',
    ],
  },
  developer: {
    name: 'Developer',
    permissions: [
      'events:read',
      'repos:read',
      'settings:read',
      'audit_logs:read',
      'workflow:rerun',
      'notifications:test',
    ],
  },
  admin: {
    name: 'Admin',
    permissions: [
      'events:read',
      'repos:read',
      'settings:read',
      'settings:write',
      'audit_logs:read',
      'workflow:rerun',
      'notifications:test',
      'users:read',
      'users:write',
      'tenants:read',
      'tenants:write',
    ],
  },
};

// Check if user has a specific permission
function hasPermission(userRole, permission) {
  const role = ROLES[userRole];
  if (!role) return false;
  return role.permissions.includes(permission);
}

// Middleware to require a specific permission
function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'viewer'; // Default to viewer if no role
    
    if (!hasPermission(userRole, permission)) {
      logger.warn({ userRole, permission }, 'Permission denied');
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        current_role: userRole,
      });
    }
    
    next();
  };
}

// Middleware to require one of multiple permissions (OR logic)
function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'viewer';
    
    const hasAny = permissions.some(p => hasPermission(userRole, p));
    if (!hasAny) {
      logger.warn({ userRole, permissions }, 'Permission denied');
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissions.join(' or '),
        current_role: userRole,
      });
    }
    
    next();
  };
}

// Get all roles with their permissions
function getRoles() {
  return ROLES;
}

// Get role by name
function getRole(name) {
  return ROLES[name] || null;
}

// Validate if a role name is valid
function isValidRole(role) {
  return role in ROLES;
}

module.exports = {
  ROLES,
  hasPermission,
  requirePermission,
  requireAnyPermission,
  getRoles,
  getRole,
  isValidRole,
};
