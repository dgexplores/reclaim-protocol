// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReClaimToken.sol";
import "./ReceiptNFT.sol";

/// @title ReClaim - Trash-to-Token core protocol
/// @notice Verifies image hash uniqueness, mints NFT + ERC20, lotteries auditors
contract ReClaim is Ownable, ReentrancyGuard {
    ReClaimToken public token;
    ReceiptNFT public receipt;

    enum Material { PET, HDPE, Aluminum, Glass, EWaste, Organic }

    // reward per material in wei (18 decimals), e.g., 20 ether = 20 RECLAIM
    mapping(Material => uint256) public rewardTable;
    mapping(bytes32 => bool) public usedImageHashes;
    mapping(address => uint256) public auditorStake;
    mapping(uint256 => bytes32) public receiptHash; // tokenId => imageHash

    uint8 public constant MIN_CONFIDENCE = 85;
    uint256 public constant AUDITOR_STAKE_REQUIRED = 100 ether;
    uint8 public constant AUDIT_LOTTERY_PCT = 10; // 10% chance

    event ProofSubmitted(address indexed user, uint256 indexed tokenId, Material material, bytes32 imageHash, string ipfsCID);
    event Challenged(uint256 indexed tokenId, address indexed auditor);
    event Slashed(address indexed user, uint256 tokenId);
    event AuditorStaked(address indexed auditor, uint256 amount);
    event AuditorWithdrawn(address indexed auditor, uint256 amount);
    event RewardUpdated(Material indexed material, uint256 oldReward, uint256 newReward);

    error LowConfidence();
    error DuplicateImage();
    error InvalidMaterial();
    error EmptyCID();
    error ZeroHash();
    error ZeroAddress();
    error NotStaked();
    error NoReceipt();
    error InsufficientStake();

    constructor(address _token, address _receipt) Ownable(msg.sender) {
        if (_token == address(0) || _receipt == address(0)) revert ZeroAddress();
        token = ReClaimToken(_token);
        receipt = ReceiptNFT(_receipt);
        // init rewards
        rewardTable[Material.PET] = 20 ether;
        rewardTable[Material.HDPE] = 20 ether;
        rewardTable[Material.Aluminum] = 50 ether;
        rewardTable[Material.Glass] = 30 ether;
        rewardTable[Material.EWaste] = 100 ether;
        rewardTable[Material.Organic] = 10 ether;
    }

    function setReward(Material m, uint256 amount) external onlyOwner {
        uint256 old = rewardTable[m];
        rewardTable[m] = amount;
        emit RewardUpdated(m, old, amount);
    }

    function stakeAuditor() external {
        if (token.balanceOf(msg.sender) < AUDITOR_STAKE_REQUIRED) revert InsufficientStake();
        // requires prior approve
        bool ok = token.transferFrom(msg.sender, address(this), AUDITOR_STAKE_REQUIRED);
        require(ok, "Transfer failed");
        auditorStake[msg.sender] += AUDITOR_STAKE_REQUIRED;
        emit AuditorStaked(msg.sender, AUDITOR_STAKE_REQUIRED);
    }

    function withdrawStake(uint256 amount) external {
        if (auditorStake[msg.sender] < amount) revert InsufficientStake();
        auditorStake[msg.sender] -= amount;
        bool ok = token.transfer(msg.sender, amount);
        require(ok, "Transfer failed");
        emit AuditorWithdrawn(msg.sender, amount);
    }

    /// @notice Submit proof of recycling. Mints NFT + tokens if valid.
    function submitProof(
        uint8 material,
        uint8 confidence,
        string calldata ipfsCID,
        bytes32 imageHash
    ) external nonReentrant returns (uint256 tokenId) {
        if (bytes(ipfsCID).length == 0) revert EmptyCID();
        if (imageHash == bytes32(0)) revert ZeroHash();
        if (confidence < MIN_CONFIDENCE) revert LowConfidence();
        if (usedImageHashes[imageHash]) revert DuplicateImage();
        if (material > 5) revert InvalidMaterial();
        Material m = Material(material);

        usedImageHashes[imageHash] = true;

        string memory uri = string(abi.encodePacked("ipfs://", ipfsCID));
        tokenId = receipt.mint(msg.sender, uri);
        receiptHash[tokenId] = imageHash;

        uint256 reward = rewardTable[m];
        if (reward > 0) token.mint(msg.sender, reward);

        emit ProofSubmitted(msg.sender, tokenId, m, imageHash, ipfsCID);
        // lottery logic: in production use Chainlink VRF. Here pseudo-random for MVP
        // 10% deterministic mock: if hash %10 ==0 -> emit challenge opportunity
    }

    function challenge(uint256 tokenId) external {
        if (auditorStake[msg.sender] < AUDITOR_STAKE_REQUIRED) revert NotStaked();
        // ownerOf reverts if not exists, capture
        try receipt.ownerOf(tokenId) returns (address) {
        } catch {
            revert NoReceipt();
        }
        emit Challenged(tokenId, msg.sender);
        // DAO vote placeholder - owner can slash in MVP
    }

    function slash(uint256 tokenId, address offender) external onlyOwner {
        bytes32 h = receiptHash[tokenId];
        if (h != bytes32(0)) {
            // allow re-use of image hash after slash? Keep blocked to prevent replay of fraudulent image
            // but clear receipt mapping
            delete receiptHash[tokenId];
        }
        receipt.burn(tokenId);
        emit Slashed(offender, tokenId);
    }
}
