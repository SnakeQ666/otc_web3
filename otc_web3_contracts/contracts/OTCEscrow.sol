// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./OTCMarket.sol";

contract OTCEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ETH地址常量
    address constant ETH_ADDRESS = address(0);

    // 托管状态枚举
    enum EscrowStatus { Created, Locked, Completed, Refunded, Disputed }

    // 托管信息结构体
    struct Escrow {
        uint256 orderId;
        address maker;
        address taker;
        address tokenToSell;
        address tokenToBuy;
        uint256 amountToSell;
        uint256 amountToBuy;
        EscrowStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }

    // OTC市场合约地址
    OTCMarket public otcMarket;

    // 托管映射：orderId => Escrow
    mapping(uint256 => Escrow) public escrows;

    // 用户作为maker的托管订单映射：maker => (orderId => Escrow)
    mapping(address => mapping(uint256 => Escrow)) public makerEscrows;

    // 用户作为taker的托管订单映射：taker => (orderId => Escrow)
    mapping(address => mapping(uint256 => Escrow)) public takerEscrows;

    // 用户作为maker的订单ID列表：maker => orderId[]
    mapping(address => uint256[]) public makerOrderIds;

    // 用户作为taker的订单ID列表：taker => orderId[]
    mapping(address => uint256[]) public takerOrderIds;

    // 全部托管订单ID数组
    uint256[] public allEscrowOrderIds;

    // 争议处理等待时间（24小时）
    uint256 public constant DISPUTE_TIMEOUT = 24 hours;

    // 事件
    event EscrowCreated(uint256 indexed orderId, address indexed maker, address indexed taker);
    event EscrowLocked(uint256 indexed orderId);
    event EscrowCompleted(uint256 indexed orderId);
    event EscrowRefunded(uint256 indexed orderId);
    event EscrowDisputed(uint256 indexed orderId);

    constructor(address _otcMarket) Ownable(msg.sender) {
        require(_otcMarket != address(0), "Invalid OTC market address");
        otcMarket = OTCMarket(_otcMarket);
    }

    // 创建托管
    function createEscrow(uint256 _orderId) external nonReentrant {
        OTCMarket.Order memory order = otcMarket.getOrder(_orderId);
        require(order.status == OTCMarket.OrderStatus.Active, "Order not active");
        require(msg.sender != order.maker, "Maker cannot be taker");

        Escrow memory newEscrow = Escrow({
            orderId: _orderId,
            maker: order.maker,
            taker: msg.sender,
            tokenToSell: order.tokenToSell,
            tokenToBuy: order.tokenToBuy,
            amountToSell: order.amountToSell,
            amountToBuy: order.amountToBuy,
            status: EscrowStatus.Created,
            createdAt: block.timestamp,
            completedAt: 0
        });

        escrows[_orderId] = newEscrow;
        makerEscrows[order.maker][_orderId] = newEscrow;
        takerEscrows[msg.sender][_orderId] = newEscrow;

        // 只在 takerOrderIds[msg.sender] 里没有该 orderId 时才 push
        bool takerHasOrder = false;
        uint256[] storage takerOrders = takerOrderIds[msg.sender];
        for (uint i = 0; i < takerOrders.length; i++) {
            if (takerOrders[i] == _orderId) {
                takerHasOrder = true;
                break;
            }
        }
        if (!takerHasOrder) {
            takerOrderIds[msg.sender].push(_orderId);
        }

        // makerOrderIds 也做同样处理
        bool makerHasOrder = false;
        uint256[] storage makerOrders = makerOrderIds[order.maker];
        for (uint i = 0; i < makerOrders.length; i++) {
            if (makerOrders[i] == _orderId) {
                makerHasOrder = true;
                break;
            }
        }
        if (!makerHasOrder) {
            makerOrderIds[order.maker].push(_orderId);
        }

        // 将订单ID添加到全局数组
        allEscrowOrderIds.push(_orderId);

        emit EscrowCreated(_orderId, order.maker, msg.sender);
    }

    // 锁定托管（卖方存入代币）
    function lockEscrow(uint256 _orderId) external payable nonReentrant {
        Escrow storage escrow = escrows[_orderId];
        require(escrow.maker == msg.sender, "Not maker");
        require(escrow.status == EscrowStatus.Created, "Invalid escrow status");

        if (escrow.tokenToSell == ETH_ADDRESS) {
            require(msg.value == escrow.amountToSell, "Incorrect ETH amount");
        } else {
            IERC20(escrow.tokenToSell).safeTransferFrom(
                msg.sender,
                address(this),
                escrow.amountToSell
            );
        }

        escrow.status = EscrowStatus.Locked;
        
        // 更新映射中的状态
        makerEscrows[escrow.maker][_orderId].status = EscrowStatus.Locked;
        takerEscrows[escrow.taker][_orderId].status = EscrowStatus.Locked;

        emit EscrowLocked(_orderId);
    }

    // 完成托管（买方确认并转账）
    function completeEscrow(uint256 _orderId) external payable nonReentrant {
        Escrow storage escrow = escrows[_orderId];
        require(escrow.taker == msg.sender, "Not taker");
        require(escrow.status == EscrowStatus.Locked, "Invalid escrow status");

        // 买方转账
        if (escrow.tokenToBuy == ETH_ADDRESS) {
            require(msg.value == escrow.amountToBuy, "Incorrect ETH amount");
            (bool success, ) = escrow.maker.call{value: escrow.amountToBuy}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(escrow.tokenToBuy).safeTransferFrom(
                msg.sender,
                escrow.maker,
                escrow.amountToBuy
            );
        }

        // 释放卖方代币
        if (escrow.tokenToSell == ETH_ADDRESS) {
            (bool success, ) = escrow.taker.call{value: escrow.amountToSell}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(escrow.tokenToSell).safeTransfer(
                escrow.taker,
                escrow.amountToSell
            );
        }

        escrow.status = EscrowStatus.Completed;
        escrow.completedAt = block.timestamp;

        // 更新映射中的状态
        makerEscrows[escrow.maker][_orderId].status = EscrowStatus.Completed;
        makerEscrows[escrow.maker][_orderId].completedAt = block.timestamp;
        takerEscrows[escrow.taker][_orderId].status = EscrowStatus.Completed;
        takerEscrows[escrow.taker][_orderId].completedAt = block.timestamp;

        // 更新订单状态
        otcMarket.completeOrder(escrow.orderId);

        emit EscrowCompleted(_orderId);
    }

    // 退款（超时或争议解决）
    function refundEscrow(uint256 _orderId) external nonReentrant {
        Escrow storage escrow = escrows[_orderId];
        require(
            escrow.status == EscrowStatus.Locked ||
            escrow.status == EscrowStatus.Disputed,
            "Invalid escrow status"
        );

        // 只有在争议状态下等待24小时后，或由管理员操作时才能退款
        require(
            (escrow.status == EscrowStatus.Disputed &&
                block.timestamp >= escrow.createdAt + DISPUTE_TIMEOUT) ||
            msg.sender == owner(),
            "Not allowed to refund"
        );

        // 退还卖方代币
        if (escrow.tokenToSell == ETH_ADDRESS) {
            (bool success, ) = escrow.maker.call{value: escrow.amountToSell}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(escrow.tokenToSell).safeTransfer(
                escrow.maker,
                escrow.amountToSell
            );
        }

        escrow.status = EscrowStatus.Refunded;

        // 更新映射中的状态
        makerEscrows[escrow.maker][_orderId].status = EscrowStatus.Refunded;
        takerEscrows[escrow.taker][_orderId].status = EscrowStatus.Refunded;

        emit EscrowRefunded(_orderId);
    }

    // 发起争议
    function disputeEscrow(uint256 _orderId) external {
        Escrow storage escrow = escrows[_orderId];
        require(
            msg.sender == escrow.maker || msg.sender == escrow.taker,
            "Not trade participant"
        );
        require(escrow.status == EscrowStatus.Locked, "Invalid escrow status");

        escrow.status = EscrowStatus.Disputed;

        // 更新映射中的状态
        makerEscrows[escrow.maker][_orderId].status = EscrowStatus.Disputed;
        takerEscrows[escrow.taker][_orderId].status = EscrowStatus.Disputed;

        emit EscrowDisputed(_orderId);
    }

    // 获取托管信息
    function getEscrow(uint256 _orderId) external view returns (Escrow memory) {
        return escrows[_orderId];
    }

    // 获取用户作为maker的所有托管订单
    function getMakerEscrows(address _maker) external view returns (Escrow[] memory) {
        uint256[] memory orderIds = makerOrderIds[_maker];
        Escrow[] memory result = new Escrow[](orderIds.length);
        
        for (uint i = 0; i < orderIds.length; i++) {
            result[i] = makerEscrows[_maker][orderIds[i]];
        }
        
        return result;
    }

    // 获取用户作为taker的所有托管订单
    function getTakerEscrows(address _taker) external view returns (Escrow[] memory) {
        uint256[] memory orderIds = takerOrderIds[_taker];
        Escrow[] memory result = new Escrow[](orderIds.length);
        
        for (uint i = 0; i < orderIds.length; i++) {
            result[i] = takerEscrows[_taker][orderIds[i]];
        }
        
        return result;
    }
    
    // 获取所有托管订单（管理员专用）
    function getAllEscrows() external view onlyOwner returns (Escrow[] memory) {
        Escrow[] memory result = new Escrow[](allEscrowOrderIds.length);
        
        for (uint i = 0; i < allEscrowOrderIds.length; i++) {
            result[i] = escrows[allEscrowOrderIds[i]];
        }
        
        return result;
    }
}