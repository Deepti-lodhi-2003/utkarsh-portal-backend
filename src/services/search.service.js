import Job from '../models/job.model.js';
import Candidate from '../models/candidate.model.js';
import Institution from '../models/institution.model.js';
import Training from '../models/training.model.js';
import Vendor from '../models/vendor.model.js';
import SearchHistory from '../models/searchHistory.model.js';
import { paginateResults, sanitizeSearchInput } from '../utils/helpers.js';

class SearchService {
    // Global search across all entities
    async globalSearch(query, options = {}) {
        const {
            type = 'all',
            page = 1,
            limit = 20,
            location,
            experience,
            salary,
            jobType,
            userId,
            sessionId,
            metadata
        } = options;

        const sanitizedQuery = sanitizeSearchInput(query);
        const { skip, limit: limitNum } = paginateResults(page, limit);

        let results = {
            jobs: [],
            candidates: [],
            institutions: [],
            trainings: [],
            vendors: [],
            totalResults: 0
        };

        const searchPromises = [];

        // Build search based on type
        if (type === 'all' || type === 'jobs') {
            searchPromises.push(this.searchJobs(sanitizedQuery, { skip, limit: limitNum, location, experience, salary, jobType }));
        }

        if (type === 'all' || type === 'candidates') {
            searchPromises.push(this.searchCandidates(sanitizedQuery, { skip, limit: limitNum, location, experience }));
        }

        if (type === 'all' || type === 'institutions') {
            searchPromises.push(this.searchInstitutions(sanitizedQuery, { skip, limit: limitNum, location }));
        }

        if (type === 'all' || type === 'trainings') {
            searchPromises.push(this.searchTrainings(sanitizedQuery, { skip, limit: limitNum, location }));
        }

        if (type === 'all' || type === 'vendors') {
            searchPromises.push(this.searchVendors(sanitizedQuery, { skip, limit: limitNum, location }));
        }

        const searchResults = await Promise.all(searchPromises);

        // Assign results based on type
        let idx = 0;
        if (type === 'all' || type === 'jobs') results.jobs = searchResults[idx++];
        if (type === 'all' || type === 'candidates') results.candidates = searchResults[idx++];
        if (type === 'all' || type === 'institutions') results.institutions = searchResults[idx++];
        if (type === 'all' || type === 'trainings') results.trainings = searchResults[idx++];
        if (type === 'all' || type === 'vendors') results.vendors = searchResults[idx++];

        // Calculate total
        results.totalResults =
            results.jobs.length +
            results.candidates.length +
            results.institutions.length +
            results.trainings.length +
            results.vendors.length;

        // Save search history
        await this.saveSearchHistory({
            user: userId,
            sessionId,
            query: sanitizedQuery,
            filters: { type, location, experience, salary, jobType },
            resultsCount: results.totalResults,
            metadata
        });

        return results;
    }

    // Search Jobs
    async searchJobs(query, options = {}) {
        const { skip = 0, limit = 20, location, experience, salary, jobType } = options;

        const filter = {
            status: 'active',
            isApproved: true
        };

        if (query) {
            filter.$or = [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { 'skills.name': { $regex: query, $options: 'i' } },
                { searchKeywords: { $regex: query, $options: 'i' } }
            ];
        }

        if (location) {
            filter['location.city'] = { $regex: location, $options: 'i' };
        }

        if (experience) {
            const [min, max] = experience.split('-').map(Number);
            if (min !== undefined) filter['experience.min'] = { $lte: min };
            if (max !== undefined) filter['experience.max'] = { $gte: max };
        }

        if (salary) {
            const { min, max } = salary;
            if (min) filter['salary.min'] = { $gte: min };
            if (max) filter['salary.max'] = { $lte: max };
        }

        if (jobType) {
            filter.jobType = jobType;
        }

        const jobs = await Job.find(filter)
            .populate('institution', 'organizationName logo address')
            .select('title slug location salary jobType experienceLevel experience createdAt views applicationsCount')
            .sort({ isFeatured: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return jobs;
    }

    // Search Candidates
    async searchCandidates(query, options = {}) {
        const { skip = 0, limit = 20, location, experience } = options;

        const filter = {
            isProfilePublic: true,
            isOpenToWork: true
        };

        if (query) {
            filter.$or = [
                { headline: { $regex: query, $options: 'i' } },
                { summary: { $regex: query, $options: 'i' } },
                { 'skills.name': { $regex: query, $options: 'i' } },
                { searchKeywords: { $regex: query, $options: 'i' } }
            ];
        }

        if (location) {
            filter['currentAddress.city'] = { $regex: location, $options: 'i' };
        }

        if (experience) {
            const [min, max] = experience.split('-').map(Number);
            if (min !== undefined) filter['totalExperience.years'] = { $gte: min };
            if (max !== undefined) filter['totalExperience.years'] = { ...filter['totalExperience.years'], $lte: max };
        }

        const candidates = await Candidate.find(filter)
            .populate('user', 'name avatar')
            .select('headline skills currentAddress totalExperience candidateType profileCompletion')
            .sort({ profileCompletion: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return candidates;
    }

    // Search Institutions
    async searchInstitutions(query, options = {}) {
        const { skip = 0, limit = 20, location, institutionType } = options;

        const filter = {
            isActive: true,
            isVerified: true
        };

        if (query) {
            filter.$or = [
                { organizationName: { $regex: query, $options: 'i' } },
                { about: { $regex: query, $options: 'i' } },
                { industryType: { $regex: query, $options: 'i' } },
                { searchKeywords: { $regex: query, $options: 'i' } }
            ];
        }

        if (location) {
            filter['address.city'] = { $regex: location, $options: 'i' };
        }

        if (institutionType) {
            filter.institutionType = institutionType;
        }

        const institutions = await Institution.find(filter)
            .select('organizationName institutionType logo address about totalJobsPosted rating')
            .sort({ isFeatured: -1, rating: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return institutions;
    }

    // Search Trainings
    async searchTrainings(query, options = {}) {
        const { skip = 0, limit = 20, location, category, mode } = options;

        const filter = {
            status: { $in: ['upcoming', 'ongoing'] },
            isActive: true,
            isApproved: true
        };

        if (query) {
            filter.$or = [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { skillsCovered: { $regex: query, $options: 'i' } },
                { searchKeywords: { $regex: query, $options: 'i' } }
            ];
        }

        if (location) {
            filter['venue.city'] = { $regex: location, $options: 'i' };
        }

        if (category) {
            filter.category = category;
        }

        if (mode) {
            filter.mode = mode;
        }

        const trainings = await Training.find(filter)
            .populate('institution', 'organizationName logo')
            .select('title slug category mode startDate duration fees venue certification placementAssistance rating')
            .sort({ startDate: 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return trainings;
    }

    // Search Vendors
    async searchVendors(query, options = {}) {
        const { skip = 0, limit = 20, location, businessType } = options;

        const filter = {
            isActive: true,
            isVerified: true
        };

        if (query) {
            filter.$or = [
                { businessName: { $regex: query, $options: 'i' } },
                { businessDescription: { $regex: query, $options: 'i' } },
                { services: { $regex: query, $options: 'i' } },
                { industries: { $regex: query, $options: 'i' } },
                { searchKeywords: { $regex: query, $options: 'i' } }
            ];
        }

        if (businessType) {
            filter.businessType = businessType;
        }

        const vendors = await Vendor.find(filter)
            .populate('institution', 'organizationName logo address')
            .select('businessName businessType services industries rating')
            .sort({ rating: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return vendors;
    }

    // Get search suggestions (autocomplete)
    async getSearchSuggestions(query, type = 'all') {
        const sanitizedQuery = sanitizeSearchInput(query);
        if (!sanitizedQuery || sanitizedQuery.length < 2) {
            return [];
        }

        const suggestions = [];
        const limit = 5;

        // Job titles
        if (type === 'all' || type === 'jobs') {
            const jobs = await Job.find({
                title: { $regex: sanitizedQuery, $options: 'i' },
                status: 'active'
            })
                .select('title')
                .limit(limit)
                .lean();

            suggestions.push(...jobs.map(j => ({
                text: j.title,
                type: 'job'
            })));
        }

        // Skills
        if (type === 'all' || type === 'jobs' || type === 'candidates') {
            const skillJobs = await Job.distinct('skills.name', {
                'skills.name': { $regex: sanitizedQuery, $options: 'i' },
                status: 'active'
            });

            suggestions.push(...skillJobs.slice(0, limit).map(s => ({
                text: s,
                type: 'skill'
            })));
        }

        // Companies/Institutions
        if (type === 'all' || type === 'institutions') {
            const institutions = await Institution.find({
                organizationName: { $regex: sanitizedQuery, $options: 'i' },
                isActive: true
            })
                .select('organizationName')
                .limit(limit)
                .lean();

            suggestions.push(...institutions.map(i => ({
                text: i.organizationName,
                type: 'company'
            })));
        }

        // Trainings
        if (type === 'all' || type === 'trainings') {
            const trainings = await Training.find({
                title: { $regex: sanitizedQuery, $options: 'i' },
                status: { $in: ['upcoming', 'ongoing'] }
            })
                .select('title')
                .limit(limit)
                .lean();

            suggestions.push(...trainings.map(t => ({
                text: t.title,
                type: 'training'
            })));
        }

        // Locations
        const locations = await Job.distinct('location.city', {
            'location.city': { $regex: sanitizedQuery, $options: 'i' },
            status: 'active'
        });

        suggestions.push(...locations.slice(0, limit).map(l => ({
            text: l,
            type: 'location'
        })));

        // Remove duplicates and limit
        const uniqueSuggestions = [...new Map(suggestions.map(s => [s.text.toLowerCase(), s])).values()];
        return uniqueSuggestions.slice(0, 10);
    }

    // Get trending searches
    async getTrendingSearches(limit = 10) {
        const trends = await SearchHistory.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
                }
            },
            {
                $group: {
                    _id: { $toLower: '$query' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    query: '$_id',
                    count: 1
                }
            }
        ]);

        return trends;
    }

    // Get recent searches for user
    async getRecentSearches(userId, limit = 10) {
        const searches = await SearchHistory.find({ user: userId })
            .select('query filters createdAt')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return searches;
    }

    // Save search history
    async saveSearchHistory(data) {
        try {
            await SearchHistory.create(data);
        } catch (error) {
            console.error('Failed to save search history:', error.message);
        }
    }

    // Clear search history for user
    async clearSearchHistory(userId) {
        await SearchHistory.deleteMany({ user: userId });
    }

    // Get popular job categories
    async getPopularCategories() {
        const categories = await Job.aggregate([
            { $match: { status: 'active' } },
            { $unwind: '$skills' },
            {
                $group: {
                    _id: '$skills.name',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 15 },
            {
                $project: {
                    _id: 0,
                    skill: '$_id',
                    jobCount: '$count'
                }
            }
        ]);

        return categories;
    }

    // Get jobs by location
    async getJobsByLocation() {
        const locations = await Job.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: '$location.city',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    city: '$_id',
                    jobCount: '$count'
                }
            }
        ]);

        return locations;
    }

    // Get jobs by industry
    async getJobsByIndustry() {
        const industries = await Job.aggregate([
            { $match: { status: 'active', isApproved: true } },
            {
                $group: {
                    _id: '$industry',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            {
                $project: {
                    _id: 0,
                    industry: '$_id',
                    jobCount: '$count'
                }
            }
        ]);

        return industries;
    }

    // Get candidates by industry
    async getCandidatesByIndustry() {
        const industries = await Candidate.aggregate([
            {
                $match: {
                    isProfilePublic: true,
                    isOpenToWork: true,
                    preferredIndustries: { $exists: true, $ne: [] }
                }
            },
            { $unwind: '$preferredIndustries' },
            {
                $group: {
                    _id: '$preferredIndustries',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            {
                $project: {
                    _id: 0,
                    industry: '$_id',
                    candidateCount: '$count'
                }
            }
        ]);

        return industries;
    }
}

export default new SearchService();