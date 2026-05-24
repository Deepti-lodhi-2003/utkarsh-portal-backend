import mongoose from 'mongoose';

const institutionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    institutionType: {
        type: String,
        enum: ['industry', 'university', 'training_institute', 'vendor'],
        required: true
    },
    organizationName: {
        type: String,
        required: [true, 'Organization name is required'],
        trim: true
    },
    slug: String,
    // Contact Person
    contactPerson: {
        name: {
            type: String,
            required: true
        },
        designation: String,
        email: String,
        phone: String
    },
    // Address
    address: {
        street: String,
        city: {
            type: String,
            
        },
        district: String,
        state: {
            type: String,
           
        },
        pincode: String
    },
    // Contact Details
    officePhone: String,
    officeMobile: String,
    website: String,
    email: String,
    // About
    about: {
        type: String,
        maxlength: 5000
    },
    establishedYear: Number,
    employeeCount: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    // Industry Specific
    industryType: [String],
    offeringIndustries: [String],
    requiredSkills: [String],
    services: [String],
    products: [String],
    // Logo
    logo: {
        public_id: String,
        url: String
    },
    // Cover Image
    coverImage: {
        public_id: String,
        url: String
    },
    // Gallery
    gallery: [{
        public_id: String,
        url: String,
        caption: String
    }],
    // Documents
   // Documents - CORRECT SCHEMA
documents: [{
    name: { type: String, required: true },
    type: { type: String, required: true },
    public_id: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}],
    // Registration Details (for vendors/industries)
    registrationDetails: {
        gstNumber: String,
        panNumber: String,
        udyamNumber: String,
        cinNumber: String
    },
    // Social Links
    socialLinks: {
        linkedin: String,
        facebook: String,
        twitter: String,
        instagram: String
    },
    // Verification
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedAt: Date,
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verificationDocuments: [{
        name: String,
        public_id: String,
        url: String
    }],
    // Stats
    totalJobsPosted: {
        type: Number,
        default: 0
    },
    totalHires: {
        type: Number,
        default: 0
    },
    rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
    },
    // Settings
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    // Search keywords
    searchKeywords: [String]
}, {
    timestamps: true
});

// Update search keywords
institutionSchema.methods.updateSearchKeywords = function() {
    const keywords = [];
    
    if (this.organizationName) keywords.push(...this.organizationName.toLowerCase().split(' '));
    if (this.industryType) keywords.push(...this.industryType.map(i => i.toLowerCase()));
    if (this.services) keywords.push(...this.services.map(s => s.toLowerCase()));
    if (this.address?.city) keywords.push(this.address.city.toLowerCase());
    
    this.searchKeywords = [...new Set(keywords.filter(Boolean))];
};

// Pre-save middleware
institutionSchema.pre('save', function() {
    this.updateSearchKeywords();
    if (this.isModified('organizationName')) {
        this.slug = this.organizationName
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
    }
    ;
});

// Indexes
institutionSchema.index({ institutionType: 1 });
institutionSchema.index({ 'address.city': 1 });
institutionSchema.index({ searchKeywords: 1 });
institutionSchema.index({ organizationName: 'text', about: 'text', searchKeywords: 'text' });

export default mongoose.model('Institution', institutionSchema);