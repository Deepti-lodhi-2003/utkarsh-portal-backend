import ApiError from '../utils/ApiError.js';

// Check if user has required role
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new ApiError(401, 'Not authorized');
        }

        if (!roles.includes(req.user.role)) {
            throw new ApiError(403, `Role '${req.user.role}' is not authorized to access this resource`);
        }

        next();
    };
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        throw new ApiError(403, 'Admin access required');
    }
    next();
};

// Check if user is institution
export const isInstitution = (req, res, next) => {
    if (!req.user || req.user.role !== 'institution') {
        throw new ApiError(403, 'Institution access required');
    }
    next();
};

// Check if user is candidate
export const isCandidate = (req, res, next) => {
    if (!req.user || req.user.role !== 'candidate') {
        throw new ApiError(403, 'Candidate access required');
    }
    next();
};

// Check ownership or admin
export const isOwnerOrAdmin = (resourceUserIdField = 'user') => {
    return (req, res, next) => {
        const resourceUserId = req.resource?.[resourceUserIdField]?.toString() || 
                              req.params.userId;
        
        const isOwner = resourceUserId === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            throw new ApiError(403, 'Not authorized to access this resource');
        }

        next();
    };
};