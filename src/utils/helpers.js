// Generate random OTP
export const generateOTP = (length = 6) => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
};

// Calculate total experience from experiences array
export const calculateExperience = (experiences) => {
    if (!experiences || experiences.length === 0) {
        return { years: 0, months: 0 };
    }

    let totalMonths = 0;

    experiences.forEach(exp => {
        const from = new Date(exp.from);
        const to = exp.isCurrent ? new Date() : new Date(exp.to);
        const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
        totalMonths += months;
    });

    return {
        years: Math.floor(totalMonths / 12),
        months: totalMonths % 12
    };
};

// Format salary for display
export const formatSalary = (min, max, currency = 'INR') => {
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0
    });

    if (min && max) {
        return `${formatter.format(min)} - ${formatter.format(max)}`;
    } else if (min) {
        return `${formatter.format(min)}+`;
    }
    return 'Not Disclosed';
};

// Pagination helper
export const paginateResults = (page = 1, limit = 10, total = 0) => {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const totalNum = parseInt(total, 10) || 0;
    const skip = (pageNum - 1) * limitNum;
    const pages = Math.ceil(totalNum / limitNum) || 1;

    return { skip, limit: limitNum, page: pageNum, pages, total: totalNum };
};

// Format mobile number for India
export const formatMobile = (mobile) => {
    const cleaned = mobile.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `+91${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+${cleaned}`;
    }
    return mobile;
};

// Build search query
export const buildSearchQuery = (keyword, fields) => {
    if (!keyword) return {};
    
    const searchRegex = new RegExp(keyword, 'i');
    return {
        $or: fields.map(field => ({ [field]: searchRegex }))
    };
};

// Sanitize search input
export const sanitizeSearchInput = (input) => {
    if (!input) return '';
    return input.trim().replace(/[<>{}]/g, '');
};

// Generate slug
export const generateSlug = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
};