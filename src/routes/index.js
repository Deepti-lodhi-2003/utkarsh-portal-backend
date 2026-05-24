import express from 'express';

import authRoutes from './auth.routes.js';
import candidateRoutes from './candidate.routes.js';
import institutionRoutes from './institution.routes.js';
import jobRoutes from './job.routes.js';
import applicationRoutes from './application.routes.js';
import trainingRoutes from './training.routes.js';
import vendorRoutes from './vendor.routes.js';
import searchRoutes from './search.routes.js';
import adminRoutes from './admin.routes.js';
import serviceRequestRoutes from './serviceRequest.routes.js';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/candidates', candidateRoutes);
router.use('/institutions', institutionRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/trainings', trainingRoutes);
router.use('/vendors', vendorRoutes);
router.use('/search', searchRoutes);
router.use('/admin', adminRoutes);
router.use('/service-requests', serviceRequestRoutes);

export default router;