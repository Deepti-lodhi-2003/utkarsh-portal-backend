import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import searchService from '../services/search.service.js';

// @desc    Global Search
// @route   GET /api/v1/search
// @access  Public
export const globalSearch = asyncHandler(async (req, res) => {
    const {
        q,
        type,
        page,
        limit,
        location,
        experience,
        salary,
        jobType,
        sortBy,
        sortOrder
    } = req.query;

    const results = await searchService.globalSearch(q, {
        type,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        location,
        experience,
        salary: salary ? JSON.parse(salary) : undefined,
        jobType,
        sortBy,
        sortOrder,
        userId: req.user?._id,
        sessionId: req.sessionID,
        metadata: {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        }
    });

    res.status(200).json(
        new ApiResponse(200, results, 'Search results fetched successfully')
    );
});

// @desc    Search Jobs
// @route   GET /api/v1/search/jobs
// @access  Public
export const searchJobs = asyncHandler(async (req, res) => {
    const {
        q,
        location,
        experience,
        salaryMin,
        salaryMax,
        jobType,
        workMode,
        experienceLevel,
        education,
        skills,
        postedWithin,
        page,
        limit,
        sortBy,
        sortOrder
    } = req.query;

    const jobs = await searchService.searchJobs(q, {
        skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20),
        limit: parseInt(limit) || 20,
        location,
        experience,
        salary: (salaryMin || salaryMax) ? { min: parseInt(salaryMin), max: parseInt(salaryMax) } : undefined,
        jobType,
        workMode,
        experienceLevel,
        education,
        skills: skills ? (Array.isArray(skills) ? skills : skills.split(',')) : undefined,
        postedWithin,
        sortBy,
        sortOrder
    });

    res.status(200).json(
        new ApiResponse(200, { jobs, total: jobs.length }, 'Jobs fetched successfully')
    );
});

// @desc    Search Candidates
// @route   GET /api/v1/search/candidates
// @access  Private (Institution/Admin)
export const searchCandidates = asyncHandler(async (req, res) => {
    const {
        q,
        location,
        experienceMin,
        experienceMax,
        skills,
        candidateType,
        noticePeriod,
        page,
        limit,
        sortBy,
        sortOrder
    } = req.query;

    const candidates = await searchService.searchCandidates(q, {
        skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20),
        limit: parseInt(limit) || 20,
        location,
        experience: (experienceMin || experienceMax) ? `${experienceMin || 0}-${experienceMax || 50}` : undefined,
        skills: skills ? (Array.isArray(skills) ? skills : skills.split(',')) : undefined,
        candidateType,
        noticePeriod
    });

    res.status(200).json(
        new ApiResponse(200, { candidates, total: candidates.length }, 'Candidates fetched successfully')
    );
});

// @desc    Search Institutions
// @route   GET /api/v1/search/institutions
// @access  Public
export const searchInstitutions = asyncHandler(async (req, res) => {
    const { q, location, institutionType, page, limit } = req.query;

    const institutions = await searchService.searchInstitutions(q, {
        skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20),
        limit: parseInt(limit) || 20,
        location,
        institutionType
    });

    res.status(200).json(
        new ApiResponse(200, { institutions, total: institutions.length }, 'Institutions fetched successfully')
    );
});

// @desc    Search Trainings
// @route   GET /api/v1/search/trainings
// @access  Public
export const searchTrainings = asyncHandler(async (req, res) => {
    const { q, location, category, mode, page, limit } = req.query;

    const trainings = await searchService.searchTrainings(q, {
        skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20),
        limit: parseInt(limit) || 20,
        location,
        category,
        mode
    });

    res.status(200).json(
        new ApiResponse(200, { trainings, total: trainings.length }, 'Trainings fetched successfully')
    );
});

// @desc    Search Vendors
// @route   GET /api/v1/search/vendors
// @access  Public
export const searchVendors = asyncHandler(async (req, res) => {
    const { q, location, businessType, page, limit } = req.query;

    const vendors = await searchService.searchVendors(q, {
        skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20),
        limit: parseInt(limit) || 20,
        location,
        businessType
    });

    res.status(200).json(
        new ApiResponse(200, { vendors, total: vendors.length }, 'Vendors fetched successfully')
    );
});

// @desc    Get Search Suggestions (Autocomplete)
// @route   GET /api/v1/search/suggestions
// @access  Public
export const getSearchSuggestions = asyncHandler(async (req, res) => {
    const { q, type } = req.query;

    const suggestions = await searchService.getSearchSuggestions(q, type);

    res.status(200).json(
        new ApiResponse(200, suggestions, 'Suggestions fetched successfully')
    );
});

// @desc    Get Trending Searches
// @route   GET /api/v1/search/trending
// @access  Public
export const getTrendingSearches = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    const trends = await searchService.getTrendingSearches(limit);

    res.status(200).json(
        new ApiResponse(200, trends, 'Trending searches fetched successfully')
    );
});

// @desc    Get Recent Searches
// @route   GET /api/v1/search/recent
// @access  Private
export const getRecentSearches = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    const searches = await searchService.getRecentSearches(req.user._id, limit);

    res.status(200).json(
        new ApiResponse(200, searches, 'Recent searches fetched successfully')
    );
});

// @desc    Clear Search History
// @route   DELETE /api/v1/search/history
// @access  Private
export const clearSearchHistory = asyncHandler(async (req, res) => {
    await searchService.clearSearchHistory(req.user._id);

    res.status(200).json(
        new ApiResponse(200, null, 'Search history cleared successfully')
    );
});

// @desc    Get Popular Categories
// @route   GET /api/v1/search/popular-categories
// @access  Public
export const getPopularCategories = asyncHandler(async (req, res) => {
    const categories = await searchService.getPopularCategories();

    res.status(200).json(
        new ApiResponse(200, categories, 'Popular categories fetched successfully')
    );
});

// @desc    Get Jobs by Location
// @route   GET /api/v1/search/jobs-by-location
// @access  Public
export const getJobsByLocation = asyncHandler(async (req, res) => {
    const locations = await searchService.getJobsByLocation();

    res.status(200).json(
        new ApiResponse(200, locations, 'Jobs by location fetched successfully')
    );
});

// @desc    Get Jobs by Industry
// @route   GET /api/v1/search/jobs-by-industry
// @access  Public
export const getJobsByIndustry = asyncHandler(async (req, res) => {
    const industries = await searchService.getJobsByIndustry();

    res.status(200).json(
        new ApiResponse(200, industries, 'Jobs by industry fetched successfully')
    );
});

// @desc    Get Candidates by Industry
// @route   GET /api/v1/search/candidates-by-industry
// @access  Public
export const getCandidatesByIndustry = asyncHandler(async (req, res) => {
    const industries = await searchService.getCandidatesByIndustry();

    res.status(200).json(
        new ApiResponse(200, industries, 'Candidates by industry fetched successfully')
    );
});