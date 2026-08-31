// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReClaimToken.sol";
import "./ReceiptNFT.sol";

/// @title ReClaim - Trash-to-Token core protocol
/// @notice Verifies image-hash uniqueness, mints Receipt NFT + $RECLAIM, and lets
///         staked auditors challenge a receipt with real economic consequences.
contract ReClaim is Ownable, ReentrancyGuard {
    ReClaimToken public token;
    ReceiptNFT public receipt;

    enum Material { PET, HDPE, Aluminum, Glass, EWaste, Organic }

    struct Receipt_ {
        address submitter;
        uint96 reward;
    }

    struct Challenge {
        address challenger;
        uint96 bond;
        bool open;
    }

    mapping(Material => uint256) public rewardTable;
    mapping(bytes32 => bool) public usedImageHashes;
    mapping(address => uint256) public auditorStake;
    mapping(address => uint256) public lockedStake; // bonded into open challenges
    mapping(uint256 => bytes32) public receiptHash; // tokenId => imageHash
    mapping(uint256 => Receipt_) public receipts;   // tokenId => submitter + reward paid
    mapping(uint256 => Challenge) public challenges;

    /// @notice Forfeited bonds accumulate here and fund correct-challenge bounties.
    uint256 public slashPool;

    uint8 public constant MIN_CONFIDENCE = 85;
    uint256 public constant AUDITOR_STAKE_REQUIRED = 100 ether;
    uint256 public constant CHALLENGE_BOND = 50 ether;
    uint8 public constant AUDIT_LOTTERY_PCT = 10; // 10% of receipts are audit-flagged

    event ProofSubmitted(address indexed user, uint256 indexed tokenId, Material material, bytes32 imageHash, string ipfsCID, bool auditFlagged);
    event Challenged(uint256 indexed tokenId, address indexed auditor, uint256 bond);
    event ChallengeResolved(uint256 indexed tokenId, address indexed auditor, bool fraudulent);
    event Slashed(address indexed offender, uint256 indexed tokenId, uint256 clawedBack);
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
    error StakeLocked();
    error AlreadyChallenged();
    error NoOpenChallenge();

    constructor(address _token, address _receipt) Ownable(msg.sender) {
        if (_token == address(0) || _receipt == address(0)) revert ZeroAddress();
        token = ReClaimToken(_token);
        receipt = ReceiptNFT(_receipt);
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

    /// @notice Deterministic, publicly verifiable audit selection derived from the
    ///         image hash itself. Anyone can recompute it; nothing to trust.
    /// ponytail: deterministic on imageHash, not VRF. A submitter can grind hashes
    /// offline to dodge the flag — swap in Chainlink VRF when that grinding is worth
    /// more than the reward it dodges.
    function auditFlagged(bytes32 imageHash) public pure returns (bool) {
        return uint256(imageHash) % 100 < AUDIT_LOTTERY_PCT;
    }

    function availableStake(address a) public view returns (uint256) {
        return auditorStake[a] - lockedStake[a];
    }

    function stakeAuditor() external nonReentrant {
        if (token.balanceOf(msg.sender) < AUDITOR_STAKE_REQUIRED) revert InsufficientStake();
        bool ok = token.transferFrom(msg.sender, address(this), AUDITOR_STAKE_REQUIRED);
        require(ok, "Transfer failed");
        auditorStake[msg.sender] += AUDITOR_STAKE_REQUIRED;
        emit AuditorStaked(msg.sender, AUDITOR_STAKE_REQUIRED);
    }

    function withdrawStake(uint256 amount) external nonReentrant {
        if (availableStake(msg.sender) < amount) revert StakeLocked();
        auditorStake[msg.sender] -= amount;
        bool ok = token.transfer(msg.sender, amount);
        require(ok, "Transfer failed");
        emit AuditorWithdrawn(msg.sender, amount);
    }

    /// @notice Submit proof of recycling. Mints Receipt NFT + material-weighted tokens.
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
        if (material > uint8(Material.Organic)) revert InvalidMaterial();
        Material m = Material(material);

        usedImageHashes[imageHash] = true;

        string memory uri = string(abi.encodePacked("ipfs://", ipfsCID));
        tokenId = receipt.mint(msg.sender, uri);
        receiptHash[tokenId] = imageHash;

        uint256 reward = rewardTable[m];
        if (reward > 0) token.mint(msg.sender, reward);
        receipts[tokenId] = Receipt_({ submitter: msg.sender, reward: uint96(reward) });

        emit ProofSubmitted(msg.sender, tokenId, m, imageHash, ipfsCID, auditFlagged(imageHash));
    }

    /// @notice Bond stake against a receipt you believe is fraudulent.
    function challenge(uint256 tokenId) external nonReentrant {
        if (auditorStake[msg.sender] < AUDITOR_STAKE_REQUIRED) revert NotStaked();
        if (availableStake(msg.sender) < CHALLENGE_BOND) revert InsufficientStake();
        if (receipts[tokenId].submitter == address(0)) revert NoReceipt();
        if (challenges[tokenId].open) revert AlreadyChallenged();

        lockedStake[msg.sender] += CHALLENGE_BOND;
        challenges[tokenId] = Challenge({ challenger: msg.sender, bond: uint96(CHALLENGE_BOND), open: true });
        emit Challenged(tokenId, msg.sender, CHALLENGE_BOND);
    }

    /// @notice Resolve an open challenge. Fraudulent => burn receipt, claw back the
    ///         reward, pay the challenger a bounty. Not fraudulent => forfeit the bond.
    /// ponytail: owner adjudicates in MVP. Swap for a token-weighted DAO vote when
    /// there is a real token distribution to vote with.
    function resolveChallenge(uint256 tokenId, bool fraudulent) external onlyOwner nonReentrant {
        Challenge storage c = challenges[tokenId];
        if (!c.open) revert NoOpenChallenge();

        address challenger = c.challenger;
        uint256 bond = c.bond;
        c.open = false;
        lockedStake[challenger] -= bond;

        if (fraudulent) {
            Receipt_ memory r = receipts[tokenId];
            uint256 clawed = token.burnFrom(r.submitter, r.reward);

            receipt.burn(tokenId);
            delete receipts[tokenId];
            // imageHash stays marked used, so the fraudulent image can never be replayed.

            uint256 bounty = slashPool < bond ? slashPool : bond;
            if (bounty > 0) {
                slashPool -= bounty;
                auditorStake[challenger] += bounty;
            }
            emit Slashed(r.submitter, tokenId, clawed);
        } else {
            // Wrong challenge: the bond is forfeited into the pool.
            auditorStake[challenger] -= bond;
            slashPool += bond;
        }
        emit ChallengeResolved(tokenId, challenger, fraudulent);
    }
}
