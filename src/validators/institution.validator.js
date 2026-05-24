import Joi from 'joi';

export const updateInstitutionSchema = Joi.object({
    organizationName: Joi.string().min(2).max(200),
    contactPerson: Joi.object({
        name: Joi.string(),
        designation: Joi.string(),
        email: Joi.string().email(),
        phone: Joi.string()
    }),
    address: Joi.object({
        street: Joi.string().allow('', null),
        city: Joi.string().allow('', null),
        district: Joi.string().allow('', null),
        state: Joi.string().allow('', null),
        pincode: Joi.string().pattern(/^\d{6}$/).allow('', null)
    }),
    officePhone: Joi.string().allow('', null),
    officeMobile: Joi.string().allow('', null),
    website: Joi.string().uri().allow('', null),
    email: Joi.string().email(),
    about: Joi.string().max(5000).allow('', null),
    establishedYear: Joi.number().min(1800).max(new Date().getFullYear()),
    employeeCount: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+').allow('', null),
    industryType: Joi.array().items(Joi.string()),
    offeringIndustries: Joi.array().items(Joi.string()),
    requiredSkills: Joi.array().items(Joi.string()),
    services: Joi.array().items(Joi.string()),
    products: Joi.array().items(Joi.string()),
    socialLinks: Joi.object({
        linkedin: Joi.string().uri().allow('', null),
        facebook: Joi.string().uri().allow('', null),
        twitter: Joi.string().uri().allow('', null),
        instagram: Joi.string().uri().allow('', null)
    }),
    registrationDetails: Joi.object({
        gstNumber: Joi.string().allow('', null),
        panNumber: Joi.string().allow('', null),
        udyamNumber: Joi.string().allow('', null),
        cinNumber: Joi.string().allow('', null)
    })
});