import Joi from 'joi';

export const createJobSchema = Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(10).max(10000).required(),
    requirements: Joi.array().items(Joi.string()),
    responsibilities: Joi.array().items(Joi.string()),
    qualifications: Joi.array().items(Joi.string()),
    skills: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            isRequired: Joi.boolean().default(true)
        })
    ),
    jobType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'freelance').default('full-time'),
    workMode: Joi.string().valid('onsite', 'remote', 'hybrid').default('onsite'),
    experienceLevel: Joi.string().valid('fresher', 'entry', 'mid', 'senior', 'executive').default('entry'),
    experience: Joi.object({
        min: Joi.number().min(0).default(0),
        max: Joi.number().min(Joi.ref('min'))
    }),
    education: Joi.string().valid('10th', '12th', 'diploma', 'graduate', 'post-graduate', 'phd', 'any'),
    industry: Joi.string().valid(
        'Manufacturing',
        'IT/Software',
        'Education',
        'Construction',
        'Automobile',
        'Finance',
        'Healthcare',
        'Telecom/BPO',
        'Food Processing',
        'Textile',
        'Pharmaceutical',
        'Retail',
        'Logistics',
        'Agriculture',
        'Other'
    ).required(),
    institution: Joi.string().optional(), // Admin only
    banner: Joi.object({
        public_id: Joi.string(),
        url: Joi.string().uri()
    }).optional(),
    salary: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number().min(Joi.ref('min')),
        currency: Joi.string().default('INR'),
        period: Joi.string().valid('monthly', 'yearly').default('yearly'),
        isNegotiable: Joi.boolean().default(false),
        isConfidential: Joi.boolean().default(false)
    }),
    location: Joi.object({
        address: Joi.string(),
        city: Joi.string().required(),
        district: Joi.string(),
        state: Joi.string().default('Madhya Pradesh'),
        pincode: Joi.string().pattern(/^\d{6}$/)
    }).required(),
    vacancies: Joi.number().min(1).default(1),
    applicationDeadline: Joi.date().greater('now'),
    applicationEmail: Joi.string().email(),
    applicationUrl: Joi.string().uri(),
    applicationInstructions: Joi.string().max(2000),
    screeningQuestions: Joi.array().items(
        Joi.object({
            question: Joi.string().required(),
            isRequired: Joi.boolean().default(false),
            type: Joi.string().valid('text', 'yesno', 'multiple').default('text'),
            options: Joi.array().items(Joi.string())
        })
    ),
    benefits: Joi.array().items(Joi.string()),
    status: Joi.string().valid('draft', 'pending').default('pending')
});

export const updateJobSchema = Joi.object({
    title: Joi.string().min(5).max(200),
    description: Joi.string().min(10).max(10000),
    requirements: Joi.array().items(Joi.string()),
    responsibilities: Joi.array().items(Joi.string()),
    qualifications: Joi.array().items(Joi.string()),
    skills: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            isRequired: Joi.boolean()
        })
    ),
    jobType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'freelance'),
    workMode: Joi.string().valid('onsite', 'remote', 'hybrid'),
    experienceLevel: Joi.string().valid('fresher', 'entry', 'mid', 'senior', 'executive'),
    experience: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number()
    }),
    education: Joi.string().valid('10th', '12th', 'diploma', 'graduate', 'post-graduate', 'phd', 'any'),
    industry: Joi.string().valid(
        'Manufacturing',
        'IT/Software',
        'Education',
        'Construction',
        'Automobile',
        'Finance',
        'Healthcare',
        'Telecom/BPO',
        'Food Processing',
        'Textile',
        'Pharmaceutical',
        'Retail',
        'Logistics',
        'Agriculture',
        'Other'
    ).optional(),
    institution: Joi.string().optional(), // Admin only
    banner: Joi.object({
        public_id: Joi.string(),
        url: Joi.string().uri()
    }).optional(),
    salary: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number(),
        currency: Joi.string(),
        period: Joi.string().valid('monthly', 'yearly'),
        isNegotiable: Joi.boolean(),
        isConfidential: Joi.boolean()
    }),
    location: Joi.object({
        address: Joi.string(),
        city: Joi.string(),
        district: Joi.string(),
        state: Joi.string(),
        pincode: Joi.string().pattern(/^\d{6}$/)
    }),
    vacancies: Joi.number().min(1),
    applicationDeadline: Joi.date(),
    applicationEmail: Joi.string().email(),
    applicationUrl: Joi.string().uri(),
    applicationInstructions: Joi.string().max(2000),
    screeningQuestions: Joi.array().items(
        Joi.object({
            question: Joi.string().required(),
            isRequired: Joi.boolean(),
            type: Joi.string().valid('text', 'yesno', 'multiple'),
            options: Joi.array().items(Joi.string())
        })
    ),
    benefits: Joi.array().items(Joi.string()),
    status: Joi.string().valid('draft', 'pending', 'active', 'paused', 'closed')
});

export const applyJobSchema = Joi.object({
    // coverLetter: Joi.string().max(5000),
    expectedSalary: Joi.number().min(0),
    noticePeriod: Joi.string(),
    availableFrom: Joi.date(),
    screeningAnswers: Joi.array().items(
        Joi.object({
            question: Joi.string().required(),
            answer: Joi.string().required()
        })
    ),
    source: Joi.string().valid('direct', 'referral', 'job_board', 'social_media', 'other').default('direct'),
    referredBy: Joi.string()
});