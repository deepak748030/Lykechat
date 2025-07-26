import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ role: 'super_admin' });
    if (existingAdmin) {
      console.log('Super admin already exists');
      process.exit(0);
    }

    // Create super admin
    const superAdmin = new Admin({
      email: process.env.ADMIN_EMAIL || 'admin@lykechat.app',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      name: 'Super Admin',
      role: 'super_admin',
      permissions: ['users', 'posts', 'services', 'reports', 'analytics', 'settings'],
      isActive: true
    });

    await superAdmin.save();
    console.log('✅ Super admin created successfully');
    console.log(`Email: ${superAdmin.email}`);
    console.log(`Password: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();