const KYC = require('../models/KYC');
const User = require('../models/User');
const { uploadToCOS } = require('../utils/fileUpload');

// 提交 KYC 申请
exports.submitKYC = async (req, res) => {
  try {
    const { realName, idType, idNumber } = req.body;
    const userId = req.user.id;

    // 检查是否已经提交过 KYC
    const existingKYC = await KYC.findOne({ where: { userId } });
    if (existingKYC) {
      return res.status(400).json({
        success: false,
        message: '您已经提交过 KYC 申请'
      });
    }

    // 检查证件号码是否已被使用
    const existingIdNumber = await KYC.findOne({ where: { idNumber } });
    if (existingIdNumber) {
      return res.status(400).json({
        success: false,
        message: '该证件号码已被使用'
      });
    }

    // 上传文件到腾讯云 COS
    const frontImage = await uploadToCOS(req.files['frontImage'][0], userId);
    const backImage = await uploadToCOS(req.files['backImage'][0], userId);
    const selfieImage = await uploadToCOS(req.files['selfieImage'][0], userId);

    // 创建 KYC 记录
    const kyc = await KYC.create({
      userId,
      realName,
      idType,
      idNumber,
      frontImage,
      backImage,
      selfieImage,
      status: 'pending'
    });

    // 更新用户的 KYC 状态
    await User.update(
      { kycStatus: 'pending' },
      { where: { id: userId } }
    );

    res.status(201).json({
      success: true,
      message: 'KYC 申请已提交',
      data: kyc
    });
  } catch (error) {
    console.error('KYC 提交错误:', error);
    res.status(500).json({
      success: false,
      message: 'KYC 提交失败',
      error: error.message
    });
  }
};

// 获取 KYC 状态
exports.getKYCStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const kyc = await KYC.findOne({ 
      where: { userId },
      attributes: { exclude: ['frontImage', 'backImage', 'selfieImage'] }
    });

    res.json({
      success: true,
      data: kyc
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取 KYC 状态失败',
      error: error.message
    });
  }
};

// 管理员审核 KYC
exports.reviewKYC = async (req, res) => {
  try {
    const { kycId } = req.params;
    const { status, rejectReason } = req.body;
    const adminId = req.user.id;

    // 检查用户是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '没有权限执行此操作'
      });
    }

    const kyc = await KYC.findByPk(kycId);
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC 申请不存在'
      });
    }

    // 更新 KYC 状态
    await kyc.update({
      status,
      rejectReason: status === 'rejected' ? rejectReason : null,
      reviewedBy: adminId,
      reviewedAt: new Date()
    });

    // 更新用户的 KYC 状态
    await User.update(
      { kycStatus: status },
      { where: { id: kyc.userId } }
    );

    res.json({
      success: true,
      message: 'KYC 审核完成',
      data: kyc
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'KYC 审核失败',
      error: error.message
    });
  }
};

// 管理员获取 KYC 列表
exports.getKYCList = async (req, res) => {
  try {
    // 检查用户是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '没有权限执行此操作'
      });
    }

    const { status, page = 1, limit = 10 } = req.query;
    const where = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.status = status;
    }

    const kycs = await KYC.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'phone']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      success: true,
      data: {
        items: kycs.rows,
        total: kycs.count,
        page: parseInt(page),
        totalPages: Math.ceil(kycs.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取 KYC 列表失败',
      error: error.message
    });
  }
};