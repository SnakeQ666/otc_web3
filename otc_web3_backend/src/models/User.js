const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user'
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
    allowNull: false
  },
  kycStatus: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'approved', 'rejected']]
    }
  },
  kycMessage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  frontImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  backImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  selfieImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

// 添加密码验证方法
User.prototype.validatePassword = async function(password) {
  try {
    console.log('开始验证密码');
    console.log('输入的密码:', password);
    console.log('存储的哈希:', this.password);
    
    const isValid = await bcrypt.compare(password, this.password);
    console.log('验证结果:', isValid);
    return isValid;
  } catch (error) {
    console.error('密码验证错误:', error);
    return false;
  }
};

module.exports = User; 