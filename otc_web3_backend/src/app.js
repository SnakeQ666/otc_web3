const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('../config/database');
const authRoutes = require('./routes/authRoutes');
const kycRoutes = require('./routes/kycRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { User } = require('./models');
require('dotenv').config({ path: '../.env.development' });

const app = express();

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/orders',orderRoutes);
// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '未找到请求的资源' });
});

// 启动服务器
const startServer = async () => {
  try {
    // 同步数据库模型，不强制重建表
    await sequelize.sync();
    console.log('数据库同步成功');

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`CORS 已配置为允许来自 ${process.env.CORS_ORIGIN || 'http://localhost:3000'} 的请求`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
};

startServer();