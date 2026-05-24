import Joi from 'joi';

export const updateProfileSchema = Joi.object({
    fatherName: Joi.string().max(100),
    dateOfBirth: Joi.date().max('now'),
    gender: Joi.string().valid('male', 'female', 'other'),
    maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed'),
    category: Joi.string().valid('general', 'obc', 'sc', 'st', 'ews'),
    nationality: Joi.string().default('Indian'),
    languages: Joi.array().items(
        Joi.object({
            language: Joi.string().required(),
            proficiency: Joi.string().valid('basic', 'intermediate', 'fluent', 'native')
        })
    ),
    currentAddress: Joi.object({
        street: Joi.string(),
        city: Joi.string(),
        district: Joi.string(),
        state: Joi.string(),
        pincode: Joi.string().pattern(/^\d{6}$/)
    }),
    permanentAddress: Joi.object({
        street: Joi.string(),
        city: Joi.string(),
        district: Joi.string(),
        state: Joi.string(),
        pincode: Joi.string().pattern(/^\d{6}$/),
        sameAsCurrent: Joi.boolean()
    }),
    headline: Joi.string().max(200),
    summary: Joi.string().max(3000),
    socialLinks: Joi.object({
        linkedin: Joi.string().uri(),
        github: Joi.string().uri(),
        portfolio: Joi.string().uri(),
        twitter: Joi.string().uri()
    }),
    preferredLocations: Joi.array().items(Joi.string()),
    preferredJobTypes: Joi.array().items(
        Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'freelance')
    ),
    preferredIndustries: Joi.array().items(Joi.string()),
    expectedSalary: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number().min(Joi.ref('min'))
    }),
    noticePeriod: Joi.string().valid('immediate', '15days', '1month', '2months', '3months', 'more'),
    willingToRelocate: Joi.boolean(),
    isProfilePublic: Joi.boolean(),
    isOpenToWork: Joi.boolean()
});

export const addEducationSchema = Joi.object({
    degree: Joi.string().required(),
    field: Joi.string(),
    institution: Joi.string().required(),
   // board: Joi.string(),
    percentage: Joi.number().min(0).max(100),
    cgpa: Joi.number().min(0).max(10),
    passingYear: Joi.number().min(1950).max(new Date().getFullYear() + 5),
    isCurrent: Joi.boolean().default(false)
});

export const updateEducationSchema = Joi.object({
    degree: Joi.string(),
    field: Joi.string(),
    institution: Joi.string(),
    board: Joi.string(),
    percentage: Joi.number().min(0).max(100),
    cgpa: Joi.number().min(0).max(10),
    passingYear: Joi.number().min(1950).max(new Date().getFullYear() + 5),
    isCurrent: Joi.boolean()
});

export const addExperienceSchema = Joi.object({
    company: Joi.string().required(),
    designation: Joi.string().required(),
    department: Joi.string(),
     from: Joi.date().required(),
    to: Joi.date().greater(Joi.ref('from')).when('isCurrent', {
        is: false,
        then: Joi.required()
    }),
    isCurrent: Joi.boolean().default(false),
    salary: Joi.number().min(0),
    description: Joi.string().max(2000),
    location: Joi.string()
});

export const updateExperienceSchema = Joi.object({
    company: Joi.string(),
    designation: Joi.string(),
    department: Joi.string(),
     from: Joi.date(),
    to: Joi.date(),
    isCurrent: Joi.boolean(),
    salary: Joi.number().min(0),
    description: Joi.string().max(2000),
    location: Joi.string()
});

export const addSkillSchema = Joi.object({
    name: Joi.string().required(),
    level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').default('intermediate')
});

export const updateSkillsSchema = Joi.object({
    skills: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert')
        })
    ).required()
});