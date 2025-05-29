// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TestToken.sol";

/**
 * @title TokenFaucet
 * @dev 管理测试代币列表和提供领取功能的合约
 */
contract TokenFaucet is Ownable, ReentrancyGuard {
    // 代币信息结构体
    struct TokenInfo {
        address tokenAddress;
        string name;
        string symbol;
        uint8 decimals;
        uint256 faucetAmount; // 每次可领取的数量
        uint256 cooldown; // 冷却时间（秒）
        bool active; // 是否激活
    }

    // 用户领取记录
    struct UserClaimInfo {
        uint256 lastClaimTime;
        uint256 totalClaimed;
    }

    // 代币列表
    TokenInfo[] public tokenList;
    
    // 代币地址 => 代币索引
    mapping(address => uint256) public tokenIndexes;
    
    // 用户地址 => 代币地址 => 领取记录
    mapping(address => mapping(address => UserClaimInfo)) public userClaims;

    // 事件
    event TokenAdded(address indexed tokenAddress, string name, string symbol);
    event TokenUpdated(address indexed tokenAddress, bool active, uint256 faucetAmount);
    event TokenClaimed(address indexed user, address indexed token, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev 添加代币到列表
     */
    function addToken(
        address tokenAddress,
        uint256 faucetAmount,
        uint256 cooldown
    ) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        require(faucetAmount > 0, "Faucet amount must be greater than 0");
        
        // 检查代币是否已存在
        for (uint256 i = 0; i < tokenList.length; i++) {
            require(tokenList[i].tokenAddress != tokenAddress, "Token already exists");
        }

        // 获取代币信息
        IERC20 token = IERC20(tokenAddress);
        TestToken testToken = TestToken(tokenAddress);
        string memory name = testToken.name();
        string memory symbol = testToken.symbol();
        uint8 decimals = testToken.decimals();

        // 添加到列表
        tokenList.push(TokenInfo({
            tokenAddress: tokenAddress,
            name: name,
            symbol: symbol,
            decimals: decimals,
            faucetAmount: faucetAmount,
            cooldown: cooldown,
            active: true
        }));

        // 更新索引
        tokenIndexes[tokenAddress] = tokenList.length - 1;

        emit TokenAdded(tokenAddress, name, symbol);
    }

    /**
     * @dev 更新代币信息
     */
    function updateToken(
        address tokenAddress,
        bool active,
        uint256 faucetAmount,
        uint256 cooldown
    ) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        
        uint256 index = tokenIndexes[tokenAddress];
        require(index < tokenList.length && tokenList[index].tokenAddress == tokenAddress, "Token not found");
        
        TokenInfo storage token = tokenList[index];
        token.active = active;
        token.faucetAmount = faucetAmount;
        token.cooldown = cooldown;

        emit TokenUpdated(tokenAddress, active, faucetAmount);
    }

    /**
     * @dev 移除代币（通过将其设置为非激活状态）
     */
    function removeToken(address tokenAddress) external onlyOwner {
        uint256 index = tokenIndexes[tokenAddress];
        require(index < tokenList.length && tokenList[index].tokenAddress == tokenAddress, "Token not found");
        
        tokenList[index].active = false;
        
        emit TokenUpdated(tokenAddress, false, tokenList[index].faucetAmount);
    }

    /**
     * @dev 领取代币
     */
    function claimToken(address tokenAddress) external nonReentrant {
        uint256 index = tokenIndexes[tokenAddress];
        require(index < tokenList.length && tokenList[index].tokenAddress == tokenAddress, "Token not found");
        
        TokenInfo storage token = tokenList[index];
        require(token.active, "Token is not active");
        
        UserClaimInfo storage userClaim = userClaims[msg.sender][tokenAddress];
        
        // 检查冷却时间
        require(
            block.timestamp >= userClaim.lastClaimTime + token.cooldown,
            "Cooldown period not passed"
        );

        // 更新用户领取记录
        userClaim.lastClaimTime = block.timestamp;
        userClaim.totalClaimed += token.faucetAmount;

        // 转移代币
        TestToken testToken = TestToken(tokenAddress);
        testToken.mint(msg.sender, token.faucetAmount);

        emit TokenClaimed(msg.sender, tokenAddress, token.faucetAmount);
    }

    /**
     * @dev 获取代币列表长度
     */
    function getTokenCount() external view returns (uint256) {
        return tokenList.length;
    }

    /**
     * @dev 获取所有代币信息
     */
    function getAllTokens() external view returns (TokenInfo[] memory) {
        return tokenList;
    }

    /**
     * @dev 获取用户可领取状态
     */
    function getClaimStatus(address user, address tokenAddress) external view returns (
        bool canClaim,
        uint256 nextClaimTime,
        uint256 totalClaimed
    ) {
        uint256 index = tokenIndexes[tokenAddress];
        
        // 如果代币不存在或不活跃，则无法领取
        if (index >= tokenList.length || !tokenList[index].active) {
            return (false, 0, 0);
        }
        
        TokenInfo storage token = tokenList[index];
        UserClaimInfo storage userClaim = userClaims[user][tokenAddress];
        
        uint256 cooldownEnd = userClaim.lastClaimTime + token.cooldown;
        bool _canClaim = block.timestamp >= cooldownEnd;
        
        return (
            _canClaim,
            _canClaim ? 0 : cooldownEnd,
            userClaim.totalClaimed
        );
    }

    /**
     * @dev 部署新的测试代币并添加到列表
     */
    function deployAndAddToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply,
        uint256 faucetAmount,
        uint256 cooldown
    ) external onlyOwner returns (address) {
        // 部署新代币
        TestToken newToken = new TestToken(
            name,
            symbol,
            decimals,
            initialSupply
        );
        
        address tokenAddress = address(newToken);
        
        // 手动添加到列表，复制addToken函数的逻辑
        require(tokenAddress != address(0), "Invalid token address");
        require(faucetAmount > 0, "Faucet amount must be greater than 0");
        
        // 检查代币是否已存在
        for (uint256 i = 0; i < tokenList.length; i++) {
            require(tokenList[i].tokenAddress != tokenAddress, "Token already exists");
        }

        // 添加到列表
        tokenList.push(TokenInfo({
            tokenAddress: tokenAddress,
            name: name,
            symbol: symbol,
            decimals: decimals,
            faucetAmount: faucetAmount,
            cooldown: cooldown,
            active: true
        }));

        // 更新索引
        tokenIndexes[tokenAddress] = tokenList.length - 1;

        emit TokenAdded(tokenAddress, name, symbol);
        
        return tokenAddress;
    }

    function mintTo(address token, address to, uint256 amount) external onlyOwner {
        TestToken(token).mint(to, amount);
    }
} 