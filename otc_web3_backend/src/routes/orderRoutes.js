const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

// 获取订单列表
router.get('/', protect, orderController.getOrders);

// 创建订单
router.post('/', protect, orderController.createOrder);

// 响应订单
router.post('/:orderId/respond', protect, orderController.respondToOrder);

module.exports = router;