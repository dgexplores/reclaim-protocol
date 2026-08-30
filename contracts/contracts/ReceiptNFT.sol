// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ReceiptNFT - ERC721 recycling receipt
contract ReceiptNFT is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;
    address public minter;

    constructor() ERC721("ReClaim Receipt", "RCRPT") Ownable(msg.sender) {}

    modifier onlyMinter() {
        require(msg.sender == minter, "Not minter");
        _;
    }

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    function mint(address to, string memory tokenURI_) external onlyMinter returns (uint256) {
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        return tokenId;
    }

    function burn(uint256 tokenId) external onlyMinter {
        _burn(tokenId);
    }
}
