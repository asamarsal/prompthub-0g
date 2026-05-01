// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @notice On-chain identity and reputation registry for AI creators.
 * @dev Integrates with 0G Agent ID concept (ERC-7857 inspired).
 *      Stores verification status, reputation metrics, and metadata URI.
 */
contract AgentRegistry is Ownable {

    struct AgentProfile {
        bool isVerified;
        string metadataUri;     // Points to 0G Storage (profile data)
        uint256 completedJobs;
        uint256 totalReviews;
        uint256 ratingSum;      // Sum of all ratings (divide by totalReviews for avg)
        uint256 registeredAt;
    }

    mapping(address => AgentProfile) public agents;
    mapping(address => bool) public authorizedUpdaters; // contracts that can update reputation

    event AgentRegistered(address indexed agent, string metadataUri);
    event AgentVerified(address indexed agent);
    event AgentUnverified(address indexed agent);
    event AgentMetadataUpdated(address indexed agent, string metadataUri);
    event ReputationUpdated(address indexed agent, uint256 newRating, bool jobCompleted);
    event UpdaterAuthorized(address indexed updater, bool authorized);

    constructor() Ownable(msg.sender) {}

    // ─── Registration ──────────────────────────────────────────────

    /// @notice Register as an AI creator/agent
    function registerAgent(string calldata metadataUri) external {
        require(agents[msg.sender].registeredAt == 0, "Already registered");
        require(bytes(metadataUri).length > 0, "Metadata required");

        agents[msg.sender] = AgentProfile({
            isVerified: false,
            metadataUri: metadataUri,
            completedJobs: 0,
            totalReviews: 0,
            ratingSum: 0,
            registeredAt: block.timestamp
        });

        emit AgentRegistered(msg.sender, metadataUri);
    }

    /// @notice Update own metadata URI
    function updateMetadata(string calldata metadataUri) external {
        require(agents[msg.sender].registeredAt > 0, "Not registered");
        require(bytes(metadataUri).length > 0, "Metadata required");
        agents[msg.sender].metadataUri = metadataUri;
        emit AgentMetadataUpdated(msg.sender, metadataUri);
    }

    // ─── Admin Verification ────────────────────────────────────────

    /// @notice Admin verifies a creator's identity
    function verifyAgent(address agent) external onlyOwner {
        require(agents[agent].registeredAt > 0, "Not registered");
        agents[agent].isVerified = true;
        emit AgentVerified(agent);
    }

    /// @notice Admin revokes verification
    function unverifyAgent(address agent) external onlyOwner {
        require(agents[agent].registeredAt > 0, "Not registered");
        agents[agent].isVerified = false;
        emit AgentUnverified(agent);
    }

    /// @notice Authorize a contract to update reputation (e.g., Marketplace, EscrowHire)
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        authorizedUpdaters[updater] = authorized;
        emit UpdaterAuthorized(updater, authorized);
    }

    // ─── Reputation ────────────────────────────────────────────────

    /// @notice Update reputation for an agent (only owner or authorized contracts)
    /// @param agent        The agent address
    /// @param rating       Rating value (0-50 representing 0.0-5.0)
    /// @param jobCompleted Whether a job was completed
    function updateReputation(
        address agent,
        uint256 rating,
        bool jobCompleted
    ) external {
        require(
            msg.sender == owner() || authorizedUpdaters[msg.sender],
            "Not authorized"
        );
        require(rating <= 50, "Max rating 5.0 (50)");
        require(agents[agent].registeredAt > 0, "Not registered");

        agents[agent].totalReviews++;
        agents[agent].ratingSum += rating;
        if (jobCompleted) {
            agents[agent].completedJobs++;
        }

        emit ReputationUpdated(agent, rating, jobCompleted);
    }

    // ─── Read Functions ────────────────────────────────────────────

    /// @notice Get full reputation data for an agent
    function getReputation(address agent) external view returns (
        bool verified,
        uint256 avgRating,
        uint256 completedJobs,
        uint256 totalReviews
    ) {
        AgentProfile memory a = agents[agent];
        uint256 avg = a.totalReviews > 0 ? a.ratingSum / a.totalReviews : 0;
        return (a.isVerified, avg, a.completedJobs, a.totalReviews);
    }

    /// @notice Check if agent is verified
    function isVerified(address agent) external view returns (bool) {
        return agents[agent].isVerified;
    }

    /// @notice Check if address is registered
    function isRegistered(address agent) external view returns (bool) {
        return agents[agent].registeredAt > 0;
    }

    /// @notice Get metadata URI
    function getMetadataUri(address agent) external view returns (string memory) {
        return agents[agent].metadataUri;
    }
}
