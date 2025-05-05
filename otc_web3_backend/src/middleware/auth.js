const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 验证 JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 从请求头获取 token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证token'
      });
    }

    try {
      // 验证 token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // 获取用户信息
      const user = await User.findByPk(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 检查用户是否被禁用
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: '账户已被禁用'
        });
      }

      // 将用户信息添加到请求对象
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '无效的token'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '认证失败',
      error: error.message
    });
  }
};

// 检查用户角色
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '没有权限执行此操作'
      });
    }
    next();
  };
};