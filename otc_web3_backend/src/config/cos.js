module.exports = {
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
  Bucket: process.env.COS_BUCKET,
  Region: process.env.COS_REGION,
  BaseUrl: process.env.COS_BASE_URL // 用于访问文件的基础URL
};