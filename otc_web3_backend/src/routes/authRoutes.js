const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../utils/fileUpload');

// 注册路由
router.post('/register', 
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'selfieImage', maxCount: 1 }
  ]),
  (req, res, next) => {
    console.log('收到注册请求:', {
      body: req.body,
      files: req.files
    });
    next();
  },
  authController.register
);

// 登录路由
router.post('/login', authController.login);

// 获取当前用户路由
router.get('/currentUser', protect, authController.getCurrentUser);

module.exports = router;