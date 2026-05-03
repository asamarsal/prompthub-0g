// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentRegistry.sol";

/**
 * @title PromptHubContests
 * @notice Multi-winner escrow for PromptHub design contests.
 * @dev Ported from Clarity prompthub-contests.clar to Solidity for 0G EVM.
 *      Brand funds contest, sets prize tiers, declares winners, auto-releases prizes.
 */
contract PromptHubContests is Ownable, ReentrancyGuard {
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant PLATFORM_FEE_PER_MILLE = 25; // 2.5% = 25 / 1000
    uint256 public constant MAX_TIERS = 5;

    address public treasury;
    IAgentRegistry public agentRegistry;
    uint256 private _nextContestId = 1;

    enum ContestStatus { OPEN, COMPLETED, CANCELLED }

    struct Contest {
        address brand;
        uint256 totalPool;
        uint256 remainingPool;
        uint256 numTiers;
        uint256 winnersDeclared;
        uint256 deadline;        // block number
        ContestStatus status;
    }

    struct PrizeTier {
        uint256 amount;
        address winner;          // address(0) if no winner yet
        bool hasWinner;
    }

    struct Submission {
        string entryId;          // 0G Storage root hash
        bool exists;
    }

    mapping(uint256 => Contest) public contests;
    mapping(uint256 => mapping(uint256 => PrizeTier)) public prizeTiers; // contestId => place => tier
    mapping(uint256 => mapping(address => Submission)) public submissions; // contestId => artist => submission

    event ContestFunded(uint256 indexed contestId, address indexed brand, uint256 totalPool, uint256 numTiers);
    event EntrySubmitted(uint256 indexed contestId, address indexed artist, string entryId);
    event WinnerDeclared(uint256 indexed contestId, uint256 place, address indexed winner, uint256 payout);
    event ContestCompleted(uint256 indexed contestId);
    event ContestCancelled(uint256 indexed contestId, uint256 refundAmount);

    constructor(address _treasury, address _agentRegistry) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        require(_agentRegistry != address(0), "Invalid registry");
        treasury = _treasury;
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /// @notice Brand funds a contest with prize tiers
    /// @param numTiers  Number of prize tiers (1-5)
    /// @param amounts   Array of prize amounts per tier (must sum to msg.value)
    /// @param deadline  Block number deadline for submissions
    function fundContest(
        uint256 numTiers,
        uint256[] calldata amounts,
        uint256 deadline
    ) external payable returns (uint256) {
        require(msg.value > 0, "Must fund contest");
        require(numTiers >= 1 && numTiers <= MAX_TIERS, "Invalid tiers");
        require(amounts.length == numTiers, "Amounts mismatch");
        require(deadline > block.number, "Deadline must be future");

        // Verify amounts sum to msg.value
        uint256 total = 0;
        for (uint256 i = 0; i < numTiers; i++) {
            require(amounts[i] > 0, "Tier amount must be > 0");
            total += amounts[i];
        }
        require(total == msg.value, "Amounts must equal deposit");

        uint256 contestId = _nextContestId++;

        contests[contestId] = Contest({
            brand: msg.sender,
            totalPool: msg.value,
            remainingPool: msg.value,
            numTiers: numTiers,
            winnersDeclared: 0,
            deadline: deadline,
            status: ContestStatus.OPEN
        });

        // Initialize prize tiers (1-indexed places)
        for (uint256 i = 0; i < numTiers; i++) {
            prizeTiers[contestId][i + 1] = PrizeTier({
                amount: amounts[i],
                winner: address(0),
                hasWinner: false
            });
        }

        emit ContestFunded(contestId, msg.sender, msg.value, numTiers);
        return contestId;
    }

    /// @notice Artist submits an entry
    function submitEntry(uint256 contestId, string calldata entryId) external {
        Contest storage c = contests[contestId];
        require(c.status == ContestStatus.OPEN, "Not open");
        require(block.number <= c.deadline, "Deadline passed");
        require(bytes(entryId).length > 0, "Entry ID required");

        submissions[contestId][msg.sender] = Submission({
            entryId: entryId,
            exists: true
        });

        emit EntrySubmitted(contestId, msg.sender, entryId);
    }

    /// @notice Brand declares winner for a tier (requires on-chain submission)
    function declareWinner(
        uint256 contestId,
        uint256 place,
        address winner
    ) external nonReentrant {
        Contest storage c = contests[contestId];
        require(msg.sender == c.brand, "Not brand");
        require(c.status == ContestStatus.OPEN, "Not open");

        PrizeTier storage tier = prizeTiers[contestId][place];
        require(tier.amount > 0, "Tier not found");
        require(!tier.hasWinner, "Already has winner");
        require(submissions[contestId][winner].exists, "No submission");

        _payWinner(contestId, place, winner, c, tier);
    }

    /// @notice Brand declares winner for a tier (no submission check — external/off-chain)
    function declareWinnerExternal(
        uint256 contestId,
        uint256 place,
        address winner
    ) external nonReentrant {
        Contest storage c = contests[contestId];
        require(msg.sender == c.brand, "Not brand");
        require(c.status == ContestStatus.OPEN, "Not open");

        PrizeTier storage tier = prizeTiers[contestId][place];
        require(tier.amount > 0, "Tier not found");
        require(!tier.hasWinner, "Already has winner");

        _payWinner(contestId, place, winner, c, tier);
    }

    /// @dev Internal: pay winner, update state, check auto-complete
    function _payWinner(
        uint256 contestId,
        uint256 place,
        address winner,
        Contest storage c,
        PrizeTier storage tier
    ) private {
        uint256 fee = (tier.amount * PLATFORM_FEE_PER_MILLE) / FEE_DENOMINATOR;
        uint256 payout = tier.amount - fee;

        tier.winner = winner;
        tier.hasWinner = true;
        c.winnersDeclared++;
        c.remainingPool -= tier.amount;

        // Pay treasury fee
        if (fee > 0) {
            (bool feeOk, ) = treasury.call{value: fee}("");
            require(feeOk, "Fee failed");
        }
        // Pay winner
        if (payout > 0) {
            (bool ok, ) = payable(winner).call{value: payout}("");
            require(ok, "Prize payout failed");
        }

        emit WinnerDeclared(contestId, place, winner, payout);

        // Update winner reputation
        try agentRegistry.updateReputation(winner, 0, true) {} catch {}

        // Auto-complete if all winners declared
        if (c.winnersDeclared >= c.numTiers) {
            c.status = ContestStatus.COMPLETED;
            emit ContestCompleted(contestId);
        }
    }

    /// @notice Cancel contest — refund remaining pool to brand
    function cancelContest(uint256 contestId) external nonReentrant {
        Contest storage c = contests[contestId];
        require(
            msg.sender == c.brand || msg.sender == owner(),
            "Not authorized"
        );
        require(c.status == ContestStatus.OPEN, "Not open");

        uint256 refund = c.remainingPool;
        c.remainingPool = 0;
        c.status = ContestStatus.CANCELLED;

        if (refund > 0) {
            (bool ok, ) = payable(c.brand).call{value: refund}("");
            require(ok, "Refund failed");
        }

        emit ContestCancelled(contestId, refund);
    }

    /// @notice Check if artist has submitted
    function hasSubmitted(uint256 contestId, address artist) external view returns (bool) {
        return submissions[contestId][artist].exists;
    }

    /// @notice Get prize tier info
    function getPrizeTier(uint256 contestId, uint256 place) external view returns (PrizeTier memory) {
        return prizeTiers[contestId][place];
    }

    /// @notice Get contest info
    function getContest(uint256 contestId) external view returns (Contest memory) {
        return contests[contestId];
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid");
        treasury = _treasury;
    }
}
