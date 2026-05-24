import Joi from 'joi';

export const sendOTPSchema = Joi.object({
    mobile: Joi.string()
        .pattern(/^[6-9]\d{9}$/)
        .required()
        .messages({
            'string.pattern.base': 'Please enter valid Indian mobile number',
            'any.required': 'Mobile number is required'
        }),
    purpose: Joi.string()
        .valid('registration', 'login', 'forgot_password', 'mobile_verification', 'change_mobile')
        .required()
});

export const verifyOTPSchema = Joi.object({
    mobile: Joi.string()
        .pattern(/^[6-9]\d{9}$/)
        .required(),
    otp: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required()
        .messages({
            'string.length': 'OTP must be 6 digits',
            'string.pattern.base': 'OTP must contain only numbers'
        }),
    purpose: Joi.string()
        .valid('registration', 'login', 'forgot_password', 'mobile_verification', 'change_mobile')
        .required()
});

export const registerCandidateSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Name must be at least 2 characters',
            'any.required': 'Name is required'
        }),
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please enter valid email',
            'any.required': 'Email is required'
        }),
    mobile: Joi.string()
        .pattern(/^[6-9]\d{9}$/)
        .required(),
    password: Joi.string()
        .min(6)
        .max(50)
        .required()
        .messages({
            'string.min': 'Password must be at least 6 characters'
        }),
    candidateType: Joi.string()
        .valid('fresher', 'experienced')
        .required(),
    // Optional additional fields
    dateOfBirth: Joi.alternatives().try(
        Joi.date(),
        Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
    ).optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    fatherName: Joi.string().max(100).optional(),
    motherName: Joi.string().max(100).optional(),
    currentAddress: Joi.object({
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        district: Joi.string().optional(),
        pincode: Joi.string().optional(),
        street: Joi.string().optional()
    }).optional(),
    headline: Joi.string().max(200).optional(),
    preferredLocations: Joi.array().items(Joi.string()).optional(),
    preferredIndustries: Joi.array().items(Joi.string()).optional(),
    skills: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional()
    })).optional(),
    experience: Joi.array().items(Joi.object({
        company: Joi.string().required(),
        designation: Joi.string().required(),
        isCurrent: Joi.boolean().optional(),
        salary: Joi.number().optional(),
        from: Joi.date().optional(),
        to: Joi.date().optional(),
        location: Joi.string().optional(),
        description: Joi.string().optional()
    })).optional(),
    education: Joi.array().items(Joi.object({
        degree: Joi.string().required(),
        field: Joi.string().optional(),
        institution: Joi.string().required(),
        board: Joi.string().optional(),
        percentage: Joi.number().optional(),
        cgpa: Joi.number().optional(),
        passingYear: Joi.number().optional(),
        isCurrent: Joi.boolean().optional()
    })).optional(),
    totalExperience: Joi.object({
        years: Joi.number().min(0).optional(),
        months: Joi.number().min(0).max(11).optional()
    }).optional(),
    currentSalary: Joi.number().optional(),
    // Additional fields
    internshipDetails: Joi.string().max(500).optional(),
    certificationDetails: Joi.string().max(500).optional(),
    passingYear: Joi.string().pattern(/^\d{4}-\d{2}$/).optional(), // YYYY-MM format
    result: Joi.string().max(100).optional(),
    isPhysicallyDisabled: Joi.boolean().optional(),
    hasApprenticeship: Joi.boolean().optional()
});

export const registerInstitutionSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    password: Joi.string().min(6).max(50).required(),
    institutionType: Joi.string()
        .valid('industry', 'university', 'training_institute', 'vendor')
        .required(),
    organizationName: Joi.string().min(2).max(200).required(),
    contactPerson: Joi.object({
        name: Joi.string().required(),
        designation: Joi.string(),
        email: Joi.string().email(),
        phone: Joi.string()
    }).required(),
    address: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().allow('').optional(),
        district: Joi.string().allow('').optional(),
        state: Joi.string().allow('').optional(),
        pincode: Joi.string().allow('').pattern(/^\d{6}$/).optional()
    }).required(),
    // Additional optional fields
    officeMobile: Joi.string().allow('').optional(),
    website: Joi.string().allow('').optional(),
    about: Joi.string().max(5000).allow('').optional(),
    offeringIndustries: Joi.array().items(Joi.string()).optional(),
    requiredSkills: Joi.array().items(Joi.string()).optional(),
    services: Joi.array().items(Joi.string()).optional()
});

export const loginSchema = Joi.object({
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    password: Joi.string().required()
});

export const loginWithOTPSchema = Joi.object({
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required()
});

export const forgotPasswordSchema = Joi.object({
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required()
});

export const resetPasswordSchema = Joi.object({
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
    newPassword: Joi.string().min(6).max(50).required(),
    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'Passwords do not match'
        })
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(50).required(),
    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'Passwords do not match'
        })
});

export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required()
});