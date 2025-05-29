// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LendingPool is Ownable, ReentrancyGuard {
    // 借贷结构
    struct Loan {
        address borrower;        // 借款人
        address collateralToken; // 质押代币
        address borrowToken;     // 借贷代币
        uint256 collateralAmount; // 质押数量
        uint256 borrowAmount;    // 借贷数量
        uint256 interestRate;    // 年化利率 (以10000为基数，如500表示5%)
        uint256 startTime;       // 开始时间
        uint256 dueTime;         // 到期时间
        bool isActive;           // 是否活跃
        bool isLiquidated;       // 是否已清算
    }

    // 代币配置
    struct TokenConfig {
        bool isSupported;        // 是否支持
        uint256 collateralRatio; // 质押率 (以10000为基数，如8000表示80%)
        uint256 borrowRate;      // 借贷利率 (以10000为基数，如500表示5%)
        uint256 maxBorrowAmount; // 最大借贷额度
    }

    // 状态变量
    mapping(address => TokenConfig) public tokenConfigs;  // 代币配置
    mapping(uint256 => Loan) public loans;               // 借贷记录
    mapping(address => mapping(address => uint256)) public userCollateral; // 用户质押信息
    uint256 public loanIdCounter;                        // 借贷ID计数器
    uint256 public constant YEAR_IN_SECONDS = 365 days;  // 一年的秒数
    uint256 public constant BASIS_POINTS = 10000;        // 基点

    // 事件
    event LoanCreated(uint256 indexed loanId, address indexed borrower, address collateralToken, address borrowToken);
    event LoanRepaid(uint256 indexed loanId);
    event LoanLiquidated(uint256 indexed loanId);
    event CollateralDeposited(address indexed user, address indexed token, uint256 amount);
    event CollateralWithdrawn(address indexed user, address indexed token, uint256 amount);
    event DebugString(string info);
    event DebugUint(string key, uint256 value);
    event DebugAddress(string key, address value);

    constructor() Ownable(msg.sender) {}

    // 设置代币配置
    function setTokenConfig(
        address token,
        bool isSupported,
        uint256 collateralRatio,
        uint256 borrowRate,
        uint256 maxBorrowAmount
    ) external onlyOwner {
        require(collateralRatio <= BASIS_POINTS, "Invalid collateral ratio");
        tokenConfigs[token] = TokenConfig({
            isSupported: isSupported,
            collateralRatio: collateralRatio,
            borrowRate: borrowRate,
            maxBorrowAmount: maxBorrowAmount
        });
    }

    // 质押代币
    function depositCollateral(address token, uint256 amount) external nonReentrant {
        require(tokenConfigs[token].isSupported, "Token not supported");
        require(amount > 0, "Amount must be greater than 0");

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        userCollateral[msg.sender][token] += amount;

        emit CollateralDeposited(msg.sender, token, amount);
    }

    // 提取质押物
    function withdrawCollateral(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(userCollateral[msg.sender][token] >= amount, "Insufficient collateral");

        // 检查是否有活跃的借贷
        for (uint256 i = 0; i < loanIdCounter; i++) {
            if (loans[i].borrower == msg.sender && loans[i].isActive) {
                require(
                    calculateCollateralRatio(msg.sender, loans[i].collateralToken) >= 
                    tokenConfigs[loans[i].collateralToken].collateralRatio,
                    "Cannot withdraw: would violate collateral ratio"
                );
            }
        }

        userCollateral[msg.sender][token] -= amount;
        IERC20(token).transfer(msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, token, amount);
    }

    // 创建借贷
    function createLoan(
        address collateralToken,
        address borrowToken,
        uint256 collateralAmount,
        uint256 borrowAmount,
        uint256 duration
    ) external nonReentrant {
        emit DebugAddress("collateralToken", collateralToken);
        emit DebugAddress("borrowToken", borrowToken);
        emit DebugUint("collateralAmount", collateralAmount);
        emit DebugUint("borrowAmount", borrowAmount);
        emit DebugUint("duration", duration);

        emit DebugString("check isSupported");
        emit DebugUint("collateralToken.isSupported", tokenConfigs[collateralToken].isSupported ? 1 : 0);
        emit DebugUint("borrowToken.isSupported", tokenConfigs[borrowToken].isSupported ? 1 : 0);
        require(tokenConfigs[collateralToken].isSupported && tokenConfigs[borrowToken].isSupported, "Token not supported");

        emit DebugString("check amount > 0");
        require(collateralAmount > 0 && borrowAmount > 0, "Amount must be greater than 0");

        emit DebugString("check duration");
        require(duration > 0 && duration <= 365 days, "Invalid duration");

        emit DebugString("check maxBorrowAmount");
        emit DebugUint("maxBorrowAmount", tokenConfigs[borrowToken].maxBorrowAmount);
        require(borrowAmount <= tokenConfigs[borrowToken].maxBorrowAmount, "Exceeds max borrow amount");

        emit DebugString("check collateral ratio");
        emit DebugUint("collateralRatio", tokenConfigs[collateralToken].collateralRatio);
        uint256 requiredCollateral = (borrowAmount * BASIS_POINTS) / tokenConfigs[collateralToken].collateralRatio;
        emit DebugUint("requiredCollateral", requiredCollateral);
        require(collateralAmount >= requiredCollateral, "Insufficient collateral");

        // 转移质押物
        IERC20(collateralToken).transferFrom(msg.sender, address(this), collateralAmount);
        userCollateral[msg.sender][collateralToken] += collateralAmount;

        // 创建借贷记录
        uint256 loanId = loanIdCounter++;
        loans[loanId] = Loan({
            borrower: msg.sender,
            collateralToken: collateralToken,
            borrowToken: borrowToken,
            collateralAmount: collateralAmount,
            borrowAmount: borrowAmount,
            interestRate: tokenConfigs[borrowToken].borrowRate,
            startTime: block.timestamp,
            dueTime: block.timestamp + duration,
            isActive: true,
            isLiquidated: false
        });

        // 转移借贷代币
        IERC20(borrowToken).transfer(msg.sender, borrowAmount);

        emit LoanCreated(loanId, msg.sender, collateralToken, borrowToken);
    }

    // 还款
    function repayLoan(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.borrower == msg.sender, "Not the borrower");
        require(loan.isActive, "Loan not active");
        require(!loan.isLiquidated, "Loan already liquidated");

        uint256 interest = calculateInterest(loan);
        uint256 totalRepayAmount = loan.borrowAmount + interest;

        // 转移还款代币
        IERC20(loan.borrowToken).transferFrom(msg.sender, address(this), totalRepayAmount);

        // 返还质押物
        IERC20(loan.collateralToken).transfer(msg.sender, loan.collateralAmount);
        userCollateral[msg.sender][loan.collateralToken] -= loan.collateralAmount;

        loan.isActive = false;

        emit LoanRepaid(loanId);
    }

    // 清算
    function liquidateLoan(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.isActive, "Loan not active");
        require(!loan.isLiquidated, "Loan already liquidated");
        require(block.timestamp > loan.dueTime, "Loan not overdue");

        uint256 interest = calculateInterest(loan);
        uint256 totalRepayAmount = loan.borrowAmount + interest;

        // 转移还款代币
        IERC20(loan.borrowToken).transferFrom(msg.sender, address(this), totalRepayAmount);

        // 转移质押物给清算人
        IERC20(loan.collateralToken).transfer(msg.sender, loan.collateralAmount);
        userCollateral[loan.borrower][loan.collateralToken] -= loan.collateralAmount;

        loan.isActive = false;
        loan.isLiquidated = true;

        emit LoanLiquidated(loanId);
    }

    // 计算利息
    function calculateInterest(Loan memory loan) public view returns (uint256) {
        uint256 timeElapsed = block.timestamp - loan.startTime;
        return (loan.borrowAmount * loan.interestRate * timeElapsed) / (YEAR_IN_SECONDS * BASIS_POINTS);
    }

    // 计算质押率
    function calculateCollateralRatio(address user, address collateralToken) public view returns (uint256) {
        uint256 totalCollateral = userCollateral[user][collateralToken];
        if (totalCollateral == 0) return 0;
        
        uint256 totalBorrowed = 0;
        for (uint256 i = 0; i < loanIdCounter; i++) {
            if (loans[i].borrower == user && loans[i].isActive) {
                totalBorrowed += loans[i].borrowAmount;
            }
        }
        
        if (totalBorrowed == 0) return BASIS_POINTS;
        return (totalCollateral * BASIS_POINTS) / totalBorrowed;
    }

    // 获取用户所有借贷
    function getUserLoans(address user) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < loanIdCounter; i++) {
            if (loans[i].borrower == user) {
                count++;
            }
        }

        uint256[] memory userLoans = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < loanIdCounter; i++) {
            if (loans[i].borrower == user) {
                userLoans[index] = i;
                index++;
            }
        }
        return userLoans;
    }

    // 获取所有活跃借贷
    function getActiveLoans() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < loanIdCounter; i++) {
            if (loans[i].isActive) {
                count++;
            }
        }

        uint256[] memory activeLoans = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < loanIdCounter; i++) {
            if (loans[i].isActive) {
                activeLoans[index] = i;
                index++;
            }
        }
        return activeLoans;
    }
} 