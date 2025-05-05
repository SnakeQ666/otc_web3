const multer = require('multer');
const COS = require('cos-nodejs-sdk-v5');
const path = require('path');
const cosConfig = require('../config/cos');

// 初始化 COS 实例
const cos = new COS({
  SecretId: cosConfig.SecretId,
  SecretKey: cosConfig.SecretKey
});

// 配置 multer 的内存存储
const storage = multer.memoryStorage();

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 只允许上传图片
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件！'), false);
  }
};

// 创建 multer 实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制文件大小为 5MB
  }
});

// 上传文件到腾讯云 COS
const uploadToCOS = async (file, userId) => {
  const ext = path.extname(file.originalname);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${userId}/${file.fieldname}/${timestamp}${ext}`;

  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: cosConfig.Bucket,
      Region: cosConfig.Region,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        // 返回文件访问URL
        resolve(`${cosConfig.BaseUrl}/${filename}`);
      }
    });
  });
};

module.exports = upload;
module.exports.uploadToCOS = uploadToCOS;