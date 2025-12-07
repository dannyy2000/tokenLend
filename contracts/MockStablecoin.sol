// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockStablecoin
 * @dev Mock ERC20 token for LOCAL TESTING ONLY
 * For Mantle deployment, use real stablecoins: USDT, USDC, MNT
 */
contract MockStablecoin is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimals_;
    }

    /**
     * @dev Mint tokens to any address (for testing only)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev Faucet function - anyone can get free tokens (for testing)
     */
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    /**
     * @dev Override decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
