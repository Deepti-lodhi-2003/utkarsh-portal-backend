// Quick test script to check institution data in MongoDB
import mongoose from 'mongoose';
import Institution from './src/models/institution.model.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/career-path';

async function checkInstitutionData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log(' Connected to MongoDB');

        // Get the latest institution
        const latestInstitution = await Institution.findOne()
            .sort({ createdAt: -1 })
            .populate('user', 'name email mobile');

        console.log('\n📊 Latest Institution Data:');
        console.log('=====================================');
        console.log('Organization Name:', latestInstitution?.organizationName);
        console.log('Institution Type:', latestInstitution?.institutionType);
        console.log('Office Mobile:', latestInstitution?.officeMobile);
        console.log('Website:', latestInstitution?.website);
        console.log('About:', latestInstitution?.about);
        console.log('Offering Industries:', latestInstitution?.offeringIndustries);
        console.log('Required Skills:', latestInstitution?.requiredSkills);
        console.log('Services:', latestInstitution?.services);
        console.log('Contact Person:', latestInstitution?.contactPerson);
        console.log('Address:', latestInstitution?.address);
        console.log('Logo:', latestInstitution?.logo);
        console.log('=====================================\n');

        await mongoose.disconnect();
        console.log(' Disconnected from MongoDB');
    } catch (error) {
        console.error(' Error:', error);
        process.exit(1);
    }
}

checkInstitutionData();
