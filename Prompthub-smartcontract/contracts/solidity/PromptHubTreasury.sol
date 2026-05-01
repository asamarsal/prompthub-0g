// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PromptHubTreasury
 * @notice Holds platform fees (2.5%) collected from marketplace, escrow, and contest transactions.
 * @dev Ported from Clarity prompthub-treasury.clar to Solidity for 0G EVM.
 */
contract PromptHubTreasury is Ownable {

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /// @notice Accept native 0G token deposits
    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Explicit deposit function
    function deposit() external payable {
        require(msg.value > 0, "Zero deposit");
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw funds (only owner/admin)
    function withdraw(address payable recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient balance");
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "Withdraw failed");
        emit Withdrawn(recipient, amount);
    }

    /// @notice Check treasury balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
