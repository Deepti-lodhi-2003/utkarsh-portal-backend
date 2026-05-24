import mongoose from 'mongoose';

const industrySchema = new mongoose.Schema({
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Industry Details
    industryName: {
        type: String,
        required: true
    },
    industryType: {
        type: String,
        enum: [
            'manufacturing',
            'it_software',
            'textile',
            'pharmaceutical',
            'food_processing',
            'automotive',
            'chemicals',
            'construction',
            'electronics',
            'engineering',
            'plastics',
            'packaging',
            'logistics',
            'other'
        ],
        required: true
    },
    subType: String,
    description: {
        type: String,
        maxlength: 5000
    },
    // Establishment
    establishedYear: Number,
    employeeCount: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    annualTurnover: String,
    // Products/Services
    products: [{
        name: String,
        description: String,
        category: String,
        image: {
            public_id: String,
            url: String
        }
    }],
    services: [String],
    mainActivities: [String],
    // Location
    plotNumber: String,
    industrialArea: String,
    // Facilities
    facilities: [String],
    plantArea: String,
    // Export
    isExporter: {
        type: Boolean,
        default: false
    },
    exportCountries: [String],
    exportPercentage: Number,
    // Certifications
    certifications: [{
        name: String,
        issuingBody: String,
        validUntil: Date,
        document: {
            public_id: String,
            url: String
        }
    }],
    // Gallery
    gallery: [{
        public_id: String,
        url: String,
        caption: String,
        type: {
            type: String,
            enum: ['facility', 'product', 'team', 'event', 'other']
        }
    }],
    // Requirements
    hiringNeeds: {
        isHiring: {
            type: Boolean,
            default: false
        },
        positions: [String],
        skillsRequired: [String]
    },
    vendorRequirements: {
        isLooking: {
            type: Boolean,
            default: false
        },
        categories: [String],
        description: String
    },
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    // Search
    searchKeywords: [String]
}, {
    timestamps: true
});

// Pre-save
industrySchema.pre('save', function() {
    const keywords = [];
    if (this.industryName) keywords.push(...this.industryName.toLowerCase().split(' '));
    if (this.industryType) keywords.push(this.industryType.toLowerCase());
    if (this.products) keywords.push(...this.products.map(p => p.name?.toLowerCase()));
    if (this.services) keywords.push(...this.services.map(s => s.toLowerCase()));
    this.searchKeywords = [...new Set(keywords.filter(Boolean))];
    ;
});

// Indexes
industrySchema.index({ industryType: 1 });
industrySchema.index({ searchKeywords: 1 });
industrySchema.index({ industryName: 'text', description: 'text', searchKeywords: 'text' });

export default mongoose.model('Industry', industrySchema);