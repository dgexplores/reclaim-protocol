// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ReClaimToken - ERC20 reward token, only ReClaim contract can mint
contract ReClaimToken is ERC20, Ownable {
    address public minter;

    constructor() ERC20("ReClaim", "RECLAIM") Ownable(msg.sender) {}

    error NotMinter();
    error ZeroAddress();
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    function setMinter(address _minter) external onlyOwner {
        if (_minter == address(0)) revert ZeroAddress();
        address old = minter;
        minter = _minter;
        emit MinterUpdated(old, _minter);
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    /// @notice Clawback path used when a receipt is proven fraudulent.
    /// Burns up to `amount`; if the holder already spent some, burns what is left.
    function burnFrom(address from, uint256 amount) external onlyMinter returns (uint256 burned) {
        uint256 bal = balanceOf(from);
        burned = amount < bal ? amount : bal;
        if (burned > 0) _burn(from, burned);
    }
}
