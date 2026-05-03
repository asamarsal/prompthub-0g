// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentRegistry.sol";

/**
 * @title PromptHubEscrowHire
 * @notice Escrow contract for P2P designer hiring.
 * @dev Ported from Clarity prompthub-escrow-hire.clar to Solidity for 0G EVM.
 */
contract PromptHubEscrowHire is Ownable, ReentrancyGuard {
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant PLATFORM_FEE_PER_MILLE = 25; // 2.5% = 25 / 1000
    uint256 public constant DISPUTE_TIMEOUT_BLOCKS = 1008; // ~1 week

    address public treasury;
    IAgentRegistry public agentRegistry;
    uint256 private _nextJobId = 1;

    enum JobStatus { PENDING, COMPLETED, REFUNDED, DISPUTED, RESOLVED }

    struct Job {
        address client;
        address artist;
        uint256 amount;
        JobStatus status;
        uint256 createdAt;   // block number
    }

    mapping(uint256 => Job) public jobs;

    event JobCreated(uint256 indexed jobId, address indexed client, address indexed artist, uint256 amount);
    event JobCompleted(uint256 indexed jobId, address indexed artist, uint256 payout);
    event JobRefunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobDisputed(uint256 indexed jobId, address indexed disputedBy);
    event JobResolved(uint256 indexed jobId, address indexed payoutTo, uint256 amount);

    constructor(address _treasury, address _agentRegistry) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        require(_agentRegistry != address(0), "Invalid registry");
        treasury = _treasury;
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /// @notice Client creates a hire job and deposits escrow
    function createJob(address artist) external payable returns (uint256) {
        require(msg.value > 0, "Must deposit funds");
        require(artist != address(0) && artist != msg.sender, "Invalid artist");

        uint256 jobId = _nextJobId++;
        jobs[jobId] = Job({
            client: msg.sender,
            artist: artist,
            amount: msg.value,
            status: JobStatus.PENDING,
            createdAt: block.number
        });

        emit JobCreated(jobId, msg.sender, artist, msg.value);
        return jobId;
    }

    /// @notice Client marks job as complete — releases funds to artist
    function completeJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "Not client");
        require(job.status == JobStatus.PENDING, "Invalid status");

        uint256 fee = (job.amount * PLATFORM_FEE_PER_MILLE) / FEE_DENOMINATOR;
        uint256 payout = job.amount - fee;

        job.status = JobStatus.COMPLETED;

        if (fee > 0) {
            (bool feeOk, ) = treasury.call{value: fee}("");
            require(feeOk, "Fee failed");
        }
        if (payout > 0) {
            (bool payOk, ) = payable(job.artist).call{value: payout}("");
            require(payOk, "Payout failed");
        }

        emit JobCompleted(jobId, job.artist, payout);

        // Update on-chain reputation (safe — won't revert if not registered)
        try agentRegistry.updateReputation(job.artist, 0, true) {} catch {}
    }

    /// @notice Client or admin refunds the job
    function refundJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(
            msg.sender == job.client || msg.sender == owner(),
            "Not authorized"
        );
        require(job.status == JobStatus.PENDING, "Invalid status");

        job.status = JobStatus.REFUNDED;

        if (job.amount > 0) {
            (bool ok, ) = payable(job.client).call{value: job.amount}("");
            require(ok, "Refund failed");
        }

        emit JobRefunded(jobId, job.client, job.amount);
    }

    /// @notice Admin sets dispute status
    function disputeJob(uint256 jobId) external {
        require(msg.sender == owner(), "Not admin");
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.PENDING, "Invalid status");

        job.status = JobStatus.DISPUTED;
        emit JobDisputed(jobId, msg.sender);
    }

    /// @notice Artist disputes after timeout (~1 week)
    function disputeJobArtist(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.artist, "Not artist");
        require(job.status == JobStatus.PENDING, "Invalid status");
        require(
            block.number > job.createdAt + DISPUTE_TIMEOUT_BLOCKS,
            "Timeout not reached"
        );

        job.status = JobStatus.DISPUTED;
        emit JobDisputed(jobId, msg.sender);
    }

    /// @notice Admin resolves dispute — pays to chosen party
    function resolveDispute(uint256 jobId, address payable payoutTo) external nonReentrant {
        require(msg.sender == owner(), "Not admin");
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.DISPUTED, "Not disputed");
        require(
            payoutTo == payable(job.client) || payoutTo == payable(job.artist),
            "Invalid payout target"
        );

        job.status = JobStatus.RESOLVED;

        if (job.amount > 0) {
            (bool ok, ) = payoutTo.call{value: job.amount}("");
            require(ok, "Resolution payout failed");
        }

        emit JobResolved(jobId, payoutTo, job.amount);
    }

    /// @notice Get job details
    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    /// @notice Update treasury address
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }
}
