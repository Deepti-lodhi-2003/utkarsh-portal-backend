// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';
// import dotenv from 'dotenv';

// dotenv.config();

// // User Schema (direct define for script)
// const userSchema = new mongoose.Schema({
//     name: String,
//     email: String,
//     mobile: String,
//     password: String,
//     role: String,
//     isActive: { type: Boolean, default: true },
//     isMobileVerified: { type: Boolean, default: true }
// }, { timestamps: true });

// const User = mongoose.model('User', userSchema);

// const createAdmin = async () => {
//     try {
//         await mongoose.connect(process.env.MONGODB_URI);
//         console.log('MongoDB Connected');

//         // Admin credentials - CHANGE THESE!
//         const adminData = {
//             name: 'Admin',
//             email: 'admin@utkarshujjain.com',
//             mobile: '6265471212',  // Change this
//             password: 'Admin@123', // Change this
//             role: 'admin',
//             isActive: true,
//             isMobileVerified: true
//         };

//         // Check if admin already exists
//         const existingAdmin = await User.findOne({ 
//             $or: [
//                 { email: adminData.email }, 
//                 { mobile: adminData.mobile }
//             ] 
//         });

//         if (existingAdmin) {
//             console.log(' Admin already exists!');
//             console.log('Email:', existingAdmin.email);
//             console.log('Mobile:', existingAdmin.mobile);
//             process.exit(0);
//         }

//         // Hash password
//         const hashedPassword = await bcrypt.hash(adminData.password, 12);
//         adminData.password = hashedPassword;

//         // Create admin
//         const admin = await User.create(adminData);

//         console.log(' Admin created successfully!');
//         console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//         console.log(' Email:', admin.email);
//         console.log(' Mobile:', '6265471212');
//         console.log(' Password:', 'Admin@123');
//         console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//         console.log('Use mobile number to login in admin panel');

//         process.exit(0);
//     } catch (error) {
//         console.error(' Error:', error.message);
//         process.exit(1);
//     }
// };

// createAdmin();