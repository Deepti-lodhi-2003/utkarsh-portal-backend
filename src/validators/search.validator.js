import Joi from 'joi';

export const globalSearchSchema = Joi.object({
    q: Joi.string().min(1).max(200).required().messages({
        'string.min': 'Search query is required',
        'any.required': 'Search query is required'
    }),
    type: Joi.string().valid('all', 'jobs', 'candidates', 'institutions', 'trainings', 'vendors').default('all'),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(50).default(20),
    location: Joi.string(),
    experience: Joi.string(),
    salary: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number()
    }),
    jobType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'freelance'),
    sortBy: Joi.string().valid('relevance', 'date', 'salary').default('relevance'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const suggestionsSchema = Joi.object({
    q: Joi.string().min(2).max(100).required(),
    type: Joi.string().valid('all', 'jobs', 'candidates', 'institutions', 'trainings', 'vendors').default('all')
});

export const jobSearchSchema = Joi.object({
    q: Joi.string().max(200),
    location: Joi.string(),
    experience: Joi.string(),
    salaryMin: Joi.number().min(0),
    salaryMax: Joi.number(),
    jobType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'freelance'),
    workMode: Joi.string().valid('onsite', 'remote', 'hybrid'),
    experienceLevel: Joi.string().valid('fresher', 'entry', 'mid', 'senior', 'executive'),
    education: Joi.string(),
    skills: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
    ),
    postedWithin: Joi.string().valid('24h', '7d', '30d', 'all').default('all'),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(50).default(20),
    sortBy: Joi.string().valid('relevance', 'date', 'salary', 'applicants').default('date'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const candidateSearchSchema = Joi.object({
    q: Joi.string().max(200),
    location: Joi.string(),
    experienceMin: Joi.number().min(0),
    experienceMax: Joi.number(),
    skills: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
    ),
    candidateType: Joi.string().valid('fresher', 'experienced'),
    noticePeriod: Joi.string().valid('immediate', '15days', '1month', '2months', '3months', 'more'),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(50).default(20),
    sortBy: Joi.string().valid('relevance', 'experience', 'updated').default('relevance'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});