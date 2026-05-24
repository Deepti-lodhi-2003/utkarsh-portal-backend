import express from 'express';
import {
    globalSearch,
    searchJobs,
    searchCandidates,
    searchInstitutions,
    searchTrainings,
    searchVendors,
    getSearchSuggestions,
    getTrendingSearches,
    getRecentSearches,
    clearSearchHistory,
    getPopularCategories,
    getJobsByLocation,
    getJobsByIndustry,
    getCandidatesByIndustry
} from '../controllers/search.controller.js';
import { protect, optionalAuth } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { searchLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validateQuery } from '../middlewares/validate.middleware.js';
import { globalSearchSchema, suggestionsSchema, jobSearchSchema, candidateSearchSchema } from '../validators/search.validator.js';

const router = express.Router();

// Global search
router.get('/', searchLimiter, optionalAuth, validateQuery(globalSearchSchema), globalSearch);

// Entity specific searches
router.get('/jobs', searchLimiter, validateQuery(jobSearchSchema), searchJobs);
router.get('/candidates', searchLimiter, validateQuery(candidateSearchSchema), searchCandidates);
router.get('/institutions', searchLimiter, searchInstitutions);
router.get('/trainings', searchLimiter, searchTrainings);
router.get('/vendors', searchLimiter, searchVendors);

// Suggestions & Trends
router.get('/suggestions', searchLimiter, validateQuery(suggestionsSchema), getSearchSuggestions);
router.get('/trending', getTrendingSearches);
router.get('/popular-categories', getPopularCategories);
router.get('/jobs-by-location', getJobsByLocation);
router.get('/jobs-by-industry', getJobsByIndustry);
router.get('/candidates-by-industry', getCandidatesByIndustry);

// User search history
router.get('/recent', protect, getRecentSearches);
router.delete('/history', protect, clearSearchHistory);

export default router;