const Order = require('../models/Order');
const User = require('../models/User');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');

exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { type, amount, price } = req.body;
    const userId = req.user.id;

    // 验证用户余额
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查余额是否充足
    const totalAmount = amount * price;
    if (type === 'buy' && user.balance < totalAmount) {
      await t.rollback();
      return res.status(400).json({ message: '余额不足' });
    }

    // 如果是买单，先冻结用户余额
    if (type === 'buy') {
      await user.update(
        {
          balance: sequelize.literal(`balance - ${totalAmount}`),
          frozenBalance: sequelize.literal(`frozenBalance + ${totalAmount}`)
        },
        { transaction: t }
      );
    }

    // 创建订单
    const order = await Order.create(
      {
        type,
        amount,
        price,
        userId
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({ data: order });
  } catch (error) {
    await t.rollback();
    console.error('创建订单失败:', error);
    res.status(500).json({ message: '创建订单失败' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          { userId: req.user.id },
          { status: 'pending' }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
    res.json({ data: orders });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ message: '获取订单列表失败' });
  }
};

exports.respondToOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { orderId } = req.params;
    const respondingUserId = req.user.id;

    const order = await Order.findByPk(orderId, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: '订单不存在' });
    }

    if (order.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ message: '订单状态不正确' });
    }

    if (order.userId === respondingUserId) {
      await t.rollback();
      return res.status(400).json({ message: '不能响应自己的订单' });
    }

    const [orderCreator, respondingUser] = await Promise.all([
      User.findByPk(order.userId, { transaction: t }),
      User.findByPk(respondingUserId, { transaction: t })
    ]);

    const totalAmount = order.amount * order.price;

    if (order.type === 'sell') {
      // 检查响应者余额
      if (respondingUser.balance < totalAmount) {
        await t.rollback();
        return res.status(400).json({ message: '余额不足' });
      }

      // 更新双方余额
      await Promise.all([
        orderCreator.update(
          { balance: sequelize.literal(`balance + ${totalAmount}`) },
          { transaction: t }
        ),
        respondingUser.update(
          { balance: sequelize.literal(`balance - ${totalAmount}`) },
          { transaction: t }
        )
      ]);
    } else { // buy order
      // 更新双方余额
      await Promise.all([
        orderCreator.update(
          {
            frozenBalance: sequelize.literal(`frozenBalance - ${totalAmount}`)
          },
          { transaction: t }
        ),
        respondingUser.update(
          { balance: sequelize.literal(`balance + ${totalAmount}`) },
          { transaction: t }
        )
      ]);
    }

    // 更新订单状态
    await order.update({ status: 'completed' }, { transaction: t });

    await t.commit();
    res.json({ data: order });
  } catch (error) {
    await t.rollback();
    console.error('响应订单失败:', error);
    res.status(500).json({ message: '响应订单失败' });
  }
};