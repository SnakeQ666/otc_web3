// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OTCMarket is ReentrancyGuard, Ownable {
    constructor() Ownable(msg.sender) {}

    // 所有订单数组
    Order[] public allOrders;

    // 订单状态枚举
    enum OrderStatus { Active, Completed, Cancelled }

    // 订单结构体
    struct Order {
        uint256 orderId;
        address maker;
        address tokenToSell;
        address tokenToBuy;
        uint256 amountToSell;
        uint256 amountToBuy;
        OrderStatus status;
        uint256 createdAt;
    }

    // 订单计数器
    uint256 private orderCounter;

    // 订单映射：orderId => Order
    mapping(uint256 => Order) public orders;

    // 用户订单映射：address => orderId[]
    mapping(address => uint256[]) public userOrders;

    // 事件
    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        address tokenToSell,
        address tokenToBuy,
        uint256 amountToSell,
        uint256 amountToBuy
    );
    event OrderCompleted(uint256 indexed orderId);
    event OrderCancelled(uint256 indexed orderId);

    // 创建订单
    // ETH地址常量
    address constant ETH_ADDRESS = address(0);

    function createOrder(
        address _tokenToSell,
        address _tokenToBuy,
        uint256 _amountToSell,
        uint256 _amountToBuy
    ) external nonReentrant returns (uint256) {
        require(_amountToSell > 0, "Invalid sell amount");
        require(_amountToBuy > 0, "Invalid buy amount");

        orderCounter++;
        uint256 orderId = orderCounter;

        Order memory newOrder = Order({
            orderId: orderId,
            maker: msg.sender,
            tokenToSell: _tokenToSell,
            tokenToBuy: _tokenToBuy,
            amountToSell: _amountToSell,
            amountToBuy: _amountToBuy,
            status: OrderStatus.Active,
            createdAt: block.timestamp
        });

        orders[orderId] = newOrder;
        userOrders[msg.sender].push(orderId);
        allOrders.push(newOrder);

        emit OrderCreated(
            orderId,
            msg.sender,
            _tokenToSell,
            _tokenToBuy,
            _amountToSell,
            _amountToBuy
        );

        return orderId;
    }
    // 获取所有订单
function getAllOrders() external view returns (Order[] memory) {
    return allOrders;
}

    // 获取订单信息
    function getOrder(uint256 _orderId) external view returns (Order memory) {
        require(_orderId > 0 && _orderId <= orderCounter, "Invalid order ID");
        return orders[_orderId];
    }

    // 获取用户所有订单
    function getUserOrders(address _user) external view returns (uint256[] memory) {
        return userOrders[_user];
    }

    // 获取活跃订单数量
    function getActiveOrderCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= orderCounter; i++) {
            if (orders[i].status == OrderStatus.Active) {
                count++;
            }
        }
        return count;
    }

    // 取消订单
    function cancelOrder(uint256 _orderId) external nonReentrant {
        require(_orderId > 0 && _orderId <= orderCounter, "Invalid order ID");
        Order storage order = orders[_orderId];
        require(order.maker == msg.sender, "Not order maker");
        require(order.status == OrderStatus.Active, "Order not active");

        order.status = OrderStatus.Cancelled;
        allOrders[_orderId - 1].status = OrderStatus.Cancelled;
        emit OrderCancelled(_orderId);
    }

    // 完成订单（仅供托管合约调用）
    function completeOrder(uint256 _orderId) external {
        require(_orderId > 0 && _orderId <= orderCounter, "Invalid order ID");
        Order storage order = orders[_orderId];
        require(order.status == OrderStatus.Active, "Order not active");

        order.status = OrderStatus.Completed;
        allOrders[_orderId - 1].status = OrderStatus.Completed;
        emit OrderCompleted(_orderId);
    }
}