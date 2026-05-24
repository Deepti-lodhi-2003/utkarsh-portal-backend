export const USER_ROLES = {
    CANDIDATE: 'candidate',
    INSTITUTION: 'institution',
    ADMIN: 'admin'
};

export const INSTITUTION_TYPES = {
    INDUSTRY: 'industry',
    UNIVERSITY: 'university',
    TRAINING_INSTITUTE: 'training_institute',
    VENDOR: 'vendor'
};

export const JOB_STATUS = {
    DRAFT: 'draft',
    PENDING: 'pending',
    ACTIVE: 'active',
    PAUSED: 'paused',
    CLOSED: 'closed',
    EXPIRED: 'expired'
};

export const APPLICATION_STATUS = {
    APPLIED: 'applied',
    VIEWED: 'viewed',
    SHORTLISTED: 'shortlisted',
    INTERVIEW_SCHEDULED: 'interview_scheduled',
    INTERVIEWED: 'interviewed',
    OFFERED: 'offered',
    HIRED: 'hired',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn'
};

export const OTP_PURPOSES = {
    REGISTRATION: 'registration',
    LOGIN: 'login',
    FORGOT_PASSWORD: 'forgot_password',
    MOBILE_VERIFICATION: 'mobile_verification',
    CHANGE_MOBILE: 'change_mobile'
};

export const SEARCH_TYPES = {
    ALL: 'all',
    JOBS: 'jobs',
    CANDIDATES: 'candidates',
    INSTITUTIONS: 'institutions',
    TRAININGS: 'trainings',
    VENDORS: 'vendors'
};

export const CLOUDINARY_FOLDERS = {
    AVATARS: 'utkarsh-ujjain/avatars',
    RESUMES: 'utkarsh-ujjain/resumes',
    LOGOS: 'utkarsh-ujjain/logos',
    DOCUMENTS: 'utkarsh-ujjain/documents',
    BANNERS: 'utkarsh-ujjain/banners',
    GALLERY: 'utkarsh-ujjain/gallery'
};

export const ALLOWED_FILE_TYPES = {
    RESUME: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENT: ['application/pdf', 'image/jpeg', 'image/png']
};

export const MAX_FILE_SIZES = {
    RESUME: 3 * 1024 * 1024,  // 3MB
    IMAGE: 2 * 1024 * 1024,   // 2MB
    LOGO: 250 * 1024,         // 250KB
    DOCUMENT: 5 * 1024 * 1024 // 5MB
};