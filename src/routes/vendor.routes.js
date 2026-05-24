import express from 'express';
import {
    createOrUpdateProfile,
    getProfile,
    getAllVendors,
    getVendorById,
    addProduct,
    updateProduct,
    deleteProduct,
    addCertification,
    deleteCertification,
    addReview,
    getVendorCategories
} from '../controllers/vendor.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { uploadAvatar as uploadImageMiddleware, uploadDocument as uploadDocMiddleware, handleUploadError } from '../middlewares/upload.middleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();


// Public routes - specific paths first
router.get('/categories', getVendorCategories);

// Vendor profile routes - MUST come BEFORE /:id route
router.post('/profile', protect, authorize('institution'), createOrUpdateProfile);
router.get('/profile', protect, authorize('institution'), getProfile);

// Products - MUST come BEFORE /:id route
router.post('/products', protect, authorize('institution'), uploadLimiter, uploadImageMiddleware, handleUploadError, addProduct);
router.put('/products/:productId', protect, authorize('institution'), uploadLimiter, uploadImageMiddleware, handleUploadError, updateProduct);
router.delete('/products/:productId', protect, authorize('institution'), deleteProduct);

// Certifications - MUST come BEFORE /:id route
router.post('/certifications', protect, authorize('institution'), uploadLimiter, uploadDocMiddleware, handleUploadError, addCertification);
router.delete('/certifications/:certId', protect, authorize('institution'), deleteCertification);

// ================================================================
// PARAMETERIZED ROUTES - MUST COME LAST
// ================================================================

// List all vendors (public)
router.get('/', getAllVendors);

// Get specific vendor by ID - MUST be AFTER all specific routes like /profile
router.get('/:id', getVendorById);

// Reviews - parameterized route, comes after specific routes
router.post('/:id/reviews', protect, addReview);

export default router;