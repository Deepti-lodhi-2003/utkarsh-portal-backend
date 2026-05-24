import express from 'express';
import {
    getDashboardStats,
    getAllUsers,
    getUserDetails,
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser,
    getPendingJobs,
    approveJob,
    rejectJob,
    getPendingInstitutions,
    verifyInstitution,
    rejectInstitution,
    getAllJobs,
    featureJob,
    getAllTrainings,
    approveTraining,
    getReports,
    getSettings,
    //  NEW Training Functions
    adminCreateTraining,
    adminUpdateTraining,
    adminDeleteTraining,
    updateTrainingStatus,
    getTrainingDetails,
    adminUploadBanner,
    adminUpdateInstitution,
    //  NEW Vendor Functions
    getPendingVendors,
    getVerifiedVendors,
    getAllVendorsAdmin,
    getVendorDetailsAdmin,
    verifyVendor,
    rejectVendor,
    adminUpdateVendor,
    deleteVendorAdmin,
    toggleVendorStatus
} from '../controllers/admin.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/role.middleware.js';
import { uploadBanner as uploadBannerMiddleware, handleUploadError } from '../middlewares/upload.middleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

// All routes require admin access
router.use(protect, isAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.get('/users/:id', getUserDetails);
router.put('/users/:id', updateUser);
router.patch('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

// Job management
router.get('/jobs', getAllJobs);
router.get('/jobs/pending', getPendingJobs);
router.patch('/jobs/:id/approve', approveJob);
router.patch('/jobs/:id/reject', rejectJob);
router.patch('/jobs/:id/feature', featureJob);

// Institution management
router.get('/institutions/pending', getPendingInstitutions);
router.patch('/institutions/:id/verify', verifyInstitution);
router.patch('/institutions/:id/reject', rejectInstitution);
router.put('/institutions/:id', adminUpdateInstitution);

// Vendor management - specific routes FIRST
router.get('/vendors/pending', getPendingVendors);
router.get('/vendors/verified', getVerifiedVendors);

// Vendor management - parameterized routes AFTER
router.get('/vendors', getAllVendorsAdmin);
router.get('/vendors/:id', getVendorDetailsAdmin);
router.patch('/vendors/:id/verify', verifyVendor);
router.patch('/vendors/:id/reject', rejectVendor);
router.patch('/vendors/:id/toggle-status', toggleVendorStatus);
router.put('/vendors/:id', adminUpdateVendor);
router.delete('/vendors/:id', deleteVendorAdmin);

//  Training management - FULL CRUD + BANNER
router.get('/trainings', getAllTrainings);
router.get('/trainings/:id', getTrainingDetails);
router.post('/trainings', adminCreateTraining);
router.put('/trainings/:id', adminUpdateTraining);
router.delete('/trainings/:id', adminDeleteTraining);
router.patch('/trainings/:id/approve', approveTraining);
router.patch('/trainings/:id/status', updateTrainingStatus);
router.post('/trainings/:id/banner', uploadLimiter, uploadBannerMiddleware, handleUploadError, adminUploadBanner);  //  BANNER

// Reports
router.get('/reports', getReports);

// Settings
router.get('/settings', getSettings);

export default router;