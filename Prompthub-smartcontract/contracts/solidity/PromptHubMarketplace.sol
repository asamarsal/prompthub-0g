// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentRegistry.sol";

/**
 * @title PromptHubMarketplace
 * @notice A marketplace for buying and selling AI prompts as ERC-721 NFTs.
 * @dev Ported from Clarity prompthub-marketplace.clar to Solidity for 0G EVM.
 *      Prompt content is stored in 0G Storage, referenced by rootHash.
 */
contract PromptHubMarketplace is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant PLATFORM_FEE_PER_MILLE = 25; // 2.5% = 25 / 1000
    address public treasury;
    IAgentRegistry public agentRegistry;

    struct Prompt {
        address creator;
        uint256 price;
        uint256 royaltyPerMille;   // 0-200 (max 20%)
        bool isActive;
        string storageHash;   // 0G Storage root hash for content
    }

    struct PromptVersion {
        string storageHash;
        string metadataUri;
        uint256 updatedAt;
        address updater;
    }

    mapping(uint256 => Prompt) public prompts;
    mapping(uint256 => PromptVersion[]) private _promptVersions;

    // Track purchases for content gating
    mapping(uint256 => mapping(address => bool)) public hasPurchased;

    event PromptListed(
        uint256 indexed tokenId,
        address indexed creator,
        uint256 price,
        string storageHash,
        string metadataUri
    );
    event PromptPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );
    event PromptDelisted(uint256 indexed tokenId);
    event PriceUpdated(uint256 indexed tokenId, uint256 oldPrice, uint256 newPrice);
    event PromptRelisted(uint256 indexed tokenId, address indexed owner, uint256 newPrice);
    event PromptVersioned(
        uint256 indexed tokenId,
        uint256 indexed version,
        string storageHash,
        string metadataUri,
        address indexed updater
    );

    constructor(address _treasury, address _agentRegistry) ERC721("PromptHub", "PHUB") Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        require(_agentRegistry != address(0), "Invalid registry");
        treasury = _treasury;
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /// @notice List a new prompt for sale (mints NFT)
    /// @param metadataUri  IPFS/0G-Storage URI for NFT metadata (image, description)
    /// @param price        Sale price in wei (native 0G token)
    /// @param royaltyPerMille  Royalty percentage in per-mille (0-200 = 0-20%)
    /// @param storageHash  0G Storage root hash where prompt content is stored
    function listPrompt(
        string calldata metadataUri,
        uint256 price,
        uint256 royaltyPerMille,
        string calldata storageHash
    ) external returns (uint256) {
        require(price > 0, "Price must be > 0");
        require(royaltyPerMille <= 200, "Royalty too high");
        require(bytes(metadataUri).length > 0, "Metadata URI required");
        require(bytes(storageHash).length > 0, "Storage hash required");

        uint256 tokenId = ++_nextTokenId;
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataUri);

        prompts[tokenId] = Prompt({
            creator: msg.sender,
            price: price,
            royaltyPerMille: royaltyPerMille,
            isActive: true,
            storageHash: storageHash
        });
        _promptVersions[tokenId].push(
            PromptVersion({
                storageHash: storageHash,
                metadataUri: metadataUri,
                updatedAt: block.timestamp,
                updater: msg.sender
            })
        );

        // Creator is auto-granted access
        hasPurchased[tokenId][msg.sender] = true;

        emit PromptListed(tokenId, msg.sender, price, storageHash, metadataUri);
        emit PromptVersioned(tokenId, 1, storageHash, metadataUri, msg.sender);
        return tokenId;
    }

    /// @notice Buy a prompt — transfers NFT, pays seller/creator/treasury
    function buyPrompt(uint256 tokenId) external payable nonReentrant {
        Prompt storage p = prompts[tokenId];
        require(p.isActive, "Not active");

        address seller = ownerOf(tokenId);
        require(msg.sender != seller, "Cannot buy own prompt");
        require(msg.value >= p.price, "Insufficient payment");

        uint256 fee = (p.price * PLATFORM_FEE_PER_MILLE) / FEE_DENOMINATOR;
        uint256 royalty = (seller != p.creator)
            ? (p.price * p.royaltyPerMille) / FEE_DENOMINATOR
            : 0;
        uint256 sellerAmount = p.price - fee - royalty;

        // Platform fee to treasury
        if (fee > 0) {
            (bool feeOk, ) = treasury.call{value: fee}("");
            require(feeOk, "Fee transfer failed");
        }

        // Royalty to original creator (secondary sales only)
        if (royalty > 0) {
            (bool royaltyOk, ) = payable(p.creator).call{value: royalty}("");
            require(royaltyOk, "Royalty transfer failed");
        }

        // Remainder to seller
        if (sellerAmount > 0) {
            (bool sellerOk, ) = payable(seller).call{value: sellerAmount}("");
            require(sellerOk, "Seller transfer failed");
        }

        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);
        p.isActive = false;

        // Grant buyer content access
        hasPurchased[tokenId][msg.sender] = true;

        // Refund excess payment
        uint256 excess = msg.value - p.price;
        if (excess > 0) {
            (bool refundOk, ) = payable(msg.sender).call{value: excess}("");
            require(refundOk, "Refund failed");
        }

        emit PromptPurchased(tokenId, msg.sender, seller, p.price);

        // Update creator reputation (sale = completed job)
        try agentRegistry.updateReputation(p.creator, 0, true) {} catch {}
    }

    /// @notice Delist active listing (only current owner)
    function delistPrompt(uint256 tokenId) external {
        require(_ownerOf(tokenId) == msg.sender, "Not owner");
        require(prompts[tokenId].isActive, "Not active");
        prompts[tokenId].isActive = false;
        emit PromptDelisted(tokenId);
    }

    /// @notice Update price (only current owner while active)
    function updatePrice(uint256 tokenId, uint256 newPrice) external {
        require(_ownerOf(tokenId) == msg.sender, "Not owner");
        require(prompts[tokenId].isActive, "Not active");
        require(newPrice > 0, "Invalid price");
        uint256 old = prompts[tokenId].price;
        prompts[tokenId].price = newPrice;
        emit PriceUpdated(tokenId, old, newPrice);
    }

    /// @notice Relist a prompt that was previously delisted or sold (only current owner)
    function relistPrompt(uint256 tokenId, uint256 newPrice) external {
        require(_ownerOf(tokenId) == msg.sender, "Not owner");
        require(!prompts[tokenId].isActive, "Already active");
        require(newPrice > 0, "Invalid price");
        
        prompts[tokenId].price = newPrice;
        prompts[tokenId].isActive = true;
        emit PromptRelisted(tokenId, msg.sender, newPrice);
    }

    /// @notice Buyer rates a creator after purchase (on-chain review)
    /// @param tokenId   The prompt token that was purchased
    /// @param rating    Rating 0-50 (representing 0.0-5.0)
    function rateCreator(uint256 tokenId, uint256 rating) external {
        require(hasPurchased[tokenId][msg.sender], "Not purchased");
        require(rating > 0 && rating <= 50, "Invalid rating");
        Prompt memory p = prompts[tokenId];
        require(p.creator != msg.sender, "Cannot rate self");

        agentRegistry.updateReputation(p.creator, rating, false);
    }

    /// @notice Create a new immutable version pointer for prompt content/metadata (creator only)
    function createPromptVersion(
        uint256 tokenId,
        string calldata newMetadataUri,
        string calldata newStorageHash
    ) external {
        require(prompts[tokenId].creator == msg.sender, "Not creator");
        require(bytes(newMetadataUri).length > 0, "Metadata required");
        require(bytes(newStorageHash).length > 0, "Storage hash required");

        prompts[tokenId].storageHash = newStorageHash;
        _setTokenURI(tokenId, newMetadataUri);

        _promptVersions[tokenId].push(
            PromptVersion({
                storageHash: newStorageHash,
                metadataUri: newMetadataUri,
                updatedAt: block.timestamp,
                updater: msg.sender
            })
        );

        emit PromptVersioned(
            tokenId,
            _promptVersions[tokenId].length,
            newStorageHash,
            newMetadataUri,
            msg.sender
        );
    }

    /// @notice Check if address can access prompt content
    function canAccess(uint256 tokenId, address user) external view returns (bool) {
        address currentOwner = _ownerOf(tokenId);
        if (currentOwner == address(0)) return false;
        return hasPurchased[tokenId][user] || currentOwner == user;
    }

    /// @notice Get storage hash (only for authorized users)
    function getStorageHash(uint256 tokenId) external view returns (string memory) {
        address currentOwner = _ownerOf(tokenId);
        require(currentOwner != address(0), "Token does not exist");
        require(
            hasPurchased[tokenId][msg.sender] || currentOwner == msg.sender,
            "Not authorized"
        );
        return prompts[tokenId].storageHash;
    }

    /// @notice Get total prompts listed
    function totalPrompts() external view returns (uint256) {
        return _nextTokenId;
    }

    function getPromptVersionCount(uint256 tokenId) external view returns (uint256) {
        return _promptVersions[tokenId].length;
    }

    function getPromptVersion(uint256 tokenId, uint256 index) external view returns (PromptVersion memory) {
        require(index < _promptVersions[tokenId].length, "Version out of bounds");
        return _promptVersions[tokenId][index];
    }

    /// @notice Update treasury address (only owner)
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }
}
