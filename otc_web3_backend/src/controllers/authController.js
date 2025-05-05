const { User, KYC } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { uploadToCOS } = require('../utils/fileUpload');
const { Op } = require('sequelize');




// 用户注册
exports.register = async (req, res) => {
  try {
    const { email, password, phone, realName, idType, idNumber } = req.body;
    const files = req.files;

    // 验证必填字段
    if (!email || !password || !phone || !realName || !idType || !idNumber) {
      return res.status(400).json({ error: '所有字段都是必填的' });
    }

    // 验证文件上传
    if (!files.frontImage?.[0] || !files.backImage?.[0] || !files.selfieImage?.[0]) {
      return res.status(400).json({ error: '请上传所有必需的证件照片' });
    }

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({
      where: { 
        [Op.or]: [
          { email },
          { phone }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: '该邮箱已被注册' });
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({ error: '该手机号已被注册' });
      }
    }

    // 上传文件到腾讯云COS
    const frontImage = await uploadToCOS(files.frontImage[0], 'temp');
    const backImage = await uploadToCOS(files.backImage[0], 'temp');
    const selfieImage = await uploadToCOS(files.selfieImage[0], 'temp');

    // 创建用户
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      phone,
      password: hashedPassword,
      realName,
      idType,
      idNumber,
      kycStatus: 'pending',
      frontImage,
      backImage,
      selfieImage
    });

    // 创建KYC记录
    await KYC.create({
      userId: user.id,
      realName,
      idType,
      idNumber,
      frontImage,
      backImage,
      selfieImage,
      status: 'pending'
    });

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: '注册成功，请等待 KYC 审核',
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        realName: user.realName,
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败，请重试' });
  }
};

// 用户登录
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    console.log("查询到的用户：",user)
    // 验证密码
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      console.log('密码验证失败:', {
        inputPassword: password,
        hashedPassword: user.password
      });
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 检查 KYC 状态
    if (user.kycStatus !== 'approved') {
      return res.status(403).json({ 
        error: '您的 KYC 认证尚未通过，请等待审核',
        kycStatus: user.kycStatus
      });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        realName: user.realName,
        kycStatus: user.kycStatus,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请重试' });
  }
};

// 获取当前用户信息
exports.getCurrentUser = async (req, res) => {
  try {
    // 直接使用中间件中已验证的用户信息
    const user = req.user;
    
    // 排除密码字段
    const userData = user.toJSON();
    delete userData.password;

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    });
  }
};