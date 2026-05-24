import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sessionId: String, // For non-logged in users
    query: {
        type: String,
        required: true
    },
    filters: {
        type: {
            type: String,
            enum: ['all', 'jobs', 'candidates', 'institutions', 'trainings', 'vendors']
        },
        location: String,
        experience: String,
        salary: {
            min: Number,
            max: Number
        },
        jobType: String,
        other: mongoose.Schema.Types.Mixed
    },
    resultsCount: Number,
    clickedResults: [{
        resultType: String,
        resultId: mongoose.Schema.Types.ObjectId,
        clickedAt: Date
    }],
    metadata: {
        ip: String,
        userAgent: String,
        device: String
    }
}, {
    timestamps: true
});

// Indexes
searchHistorySchema.index({ user: 1 });
searchHistorySchema.index({ query: 1 });
searchHistorySchema.index({ createdAt: -1 });
searchHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days TTL

export default mongoose.model('SearchHistory', searchHistorySchema);