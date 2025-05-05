const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sequelize = require('../config/database');

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const adminUser = await User.create({
      email: 'admin@example.com',
      phone: '13800138000',
      password: hashedPassword,
      role: 'admin',
      realName: 'Admin User',
      idType: 'ID',
      idNumber: 'ADMIN123456',
      kycStatus: 'approved',
      frontImage: 'admin_front.jpg',
      backImage: 'admin_back.jpg',
      selfieImage: 'admin_selfie.jpg',
      isActive: true
    });

    console.log('管理员账户创建成功:', adminUser.id);
    process.exit(0);
  } catch (error) {
    console.error('创建管理员账户失败:', error);
    process.exit(1);
  }
}

createAdmin();