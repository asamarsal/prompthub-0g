// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    function updateReputation(address agent, uint256 rating, bool jobCompleted) external;
    function isRegistered(address agent) external view returns (bool);
}
