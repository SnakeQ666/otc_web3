const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const User = require('./User');

const KYC = sequelize.define('KYC', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  realName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  idType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  idNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  frontImage: {
    type: DataTypes.STRING,  // 存储证件正面照片的URL
    allowNull: false
  },
  backImage: {
    type: DataTypes.STRING,  // 存储证件背面照片的URL
    allowNull: false
  },
  selfieImage: {
    type: DataTypes.STRING,  // 存储手持证件照片的URL
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  rejectReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'kycs',  // 显式指定表名
  timestamps: true  // 自动添加 createdAt 和 updatedAt
});

// 建立与 User 模型的关联
KYC.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'user'
});

User.hasOne(KYC, {
  foreignKey: 'userId',
  as: 'kyc'
});

module.exports = KYC;