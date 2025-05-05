const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../utils/fileUpload');
const {
  submitKYC,
  getKYCStatus,
  reviewKYC,
  getKYCList
} = require('../controllers/kycController');

// 配置文件上传
const kycUpload = upload.fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 },
  { name: 'selfieImage', maxCount: 1 }
]);

// 用户路由
router.post('/submit', protect, kycUpload, submitKYC);
router.get('/status', protect, getKYCStatus);

// 管理员路由
router.get('/list', protect, authorize('admin'), getKYCList);
router.put('/:kycId/review', protect, authorize('admin'), reviewKYC);

module.exports = router; 