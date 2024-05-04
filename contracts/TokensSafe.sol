// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

//=============================================================//
//                           IMPORTS                           //
//=============================================================//
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/**
 * @author Emanuele Bellocchia (ebellocchia@gmail.com)
 * @title  Smart contract implementing a simple safe for tokens.
 *         The contract allows an account to set a password (by providing the password hash) and deposit tokens.
 *         The deposited tokens are held by the contract and can be withdrawn by the owner account only by providing the correct password.
 */
contract TokensSafe is
    Context
{
    using SafeERC20 for IERC20;

    //=============================================================//
    //                            ERRORS                           //
    //=============================================================//

    /**
     * Error raised if amount is not valid
     * @param account Account address
     * @param token   Token address
     * @param amount  Amount
     */
    error AmountError(
        address account,
        IERC20 token,
        uint256 amount
    );

    /**
     * Error raised if the password of an account is not initialized
     * @param account Account address
     */
    error PasswordNotInitializedError(
        address account
    );

    /**
     * Error raised if the password of an account is initialized
     * @param account Account address
     */
    error PasswordInitializedError(
        address account
    );

    /**
     * Error raised if the new password of an account is the same of the old one
     * @param account Account address
     */
    error PasswordSameError(
        address account
    );

    /**
     * Error raised if the password of an account is wrong
     * @param account Account address
     */
    error PasswordWrongError(
        address account
    );

    //=============================================================//
    //                          MODIFIERS                          //
    //=============================================================//

    /**
     * Modifier to check if the password of an account is initialized
     * @param account Account address
     */
    modifier onlyInitializedPassword(
        address account
    ) {
        if (!accountSafes[account].passwordInitialized) {
            revert PasswordNotInitializedError(account);
        }
        _;
    }

    /**
     * Modifier to check if the password of an account is not initialized
     * @param account Account address
     */
    modifier onlyNotInitializedPassword(
        address account
    ) {
        if (accountSafes[account].passwordInitialized) {
            revert PasswordInitializedError(account);
        }
        _;
    }

    /**
     * Modifier to check if the password of an account is valid
     * @param account  Account address
     * @param password Password
     */
    modifier onlyValidPassword(
        address account,
        string memory password
    ) {
        if (!accountSafes[account].passwordInitialized || accountSafes[account].passwordHash != computePasswordHash(password)) {
            revert PasswordWrongError(account);
        }
        _;
    }

    //=============================================================//
    //                            EVENTS                           //
    //=============================================================//

    /**
     * Event emitted when password of an account is initialized
     * @param account      Account address
     * @param passwordHash Password hash
     */
    event PasswordInitialized(
        address account,
        bytes32 passwordHash
    );

    /**
     * Event emitted when password of an account is changed
     * @param account         Account address
     * @param passwordHashOld Old password hash
     * @param passwordHashNew New password hash
     */
    event PasswordChanged(
        address account,
        bytes32 passwordHashOld,
        bytes32 passwordHashNew
    );

    /**
     * Event emitted when tokens are deposited
     * @param account Account address
     * @param token   Token addres
     * @param amount  Amount
     */
    event TokenDeposited(
        address account,
        IERC20 token,
        uint256 amount
    );

    /**
     * Event emitted when tokens are withdrawn
     * @param account Account address
     * @param token   Token addres
     * @param amount  Amount
     */
    event TokenWithdrawn(
        address account,
        IERC20 token,
        uint256 amount
    );

    //=============================================================//
    //                         STRUCTURES                          //
    //=============================================================//

    /// Structure for an account safe data
    struct AccountSafe {
        bool passwordInitialized;
        bytes32 passwordHash;
        mapping(IERC20 => uint256) tokenBalances;
    }

    //=============================================================//
    //                           STORAGE                           //
    //=============================================================//

    /// Mapping from account address to account safe data
    mapping(address => AccountSafe) public accountSafes;

    //=============================================================//
    //                       PUBLIC FUNCTIONS                      //
    //=============================================================//

    /**
     * Compute password hash
     * @param password_ Password string
     * @return Password hash
     */
    function computePasswordHash(
        string memory password_
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(password_));
    }

    /**
     * Initialize password of the caller account
     * The function can be called only if the password is not already initialized
     * @param initPasswordHash_ Initial password hash
     */
    function initPassword(
        bytes32 initPasswordHash_
    ) external onlyNotInitializedPassword(_msgSender()) {
        __initPassword(_msgSender(), initPasswordHash_);
    }

    /**
     * Change password of the caller account
     * The function can be called only if the password is initialized
     * @param currentPassword_ Current password
     * @param newPasswordHash_ New password hash
     */
    function changePassword(
        string memory currentPassword_,
        bytes32 newPasswordHash_
    ) external onlyValidPassword(_msgSender(), currentPassword_) {
        __setPassword(_msgSender(), newPasswordHash_);
    }

    /**
     * Get the token balance of the caller account
     * @param token_ Token address
     * @return Token balance
     */
    function tokenBalance(
        IERC20 token_
    ) external view returns (uint256) {
        return accountSafes[_msgSender()].tokenBalances[token_];
    }

    /**
     * Deposit token
     * The function can be called only if the password is initialized
     * @param token_  Token addres
     * @param amount_ Amount
     */
    function depositToken(
        IERC20 token_,
        uint256 amount_
    ) external onlyInitializedPassword(_msgSender()) {
        address account = _msgSender();

        if (amount_ == 0) {
            revert AmountError(
                account,
                token_,
                0
            );
        }

        token_.safeTransferFrom(
            account,
            address(this),
            amount_
        );

        accountSafes[account].tokenBalances[token_] += amount_;

        emit TokenDeposited(account, token_, amount_);
    }

    /**
     * Withdraw token
     * Since the password will be compromised after the withdrawal (it'll be visible from the TX parameters),
     * a new password shall be provided
     * @param token_           Token addres
     * @param amount_          Amount
     * @param currentPassword_ Current password
     * @param newPasswordHash_ New password hash
     */
    function withdrawToken(
        IERC20 token_,
        uint256 amount_,
        string memory currentPassword_,
        bytes32 newPasswordHash_
    ) external onlyValidPassword(_msgSender(), currentPassword_) {
        address account = _msgSender();
        uint256 balance = accountSafes[account].tokenBalances[token_];

        if ((amount_ == 0) || (amount_ > balance)) {
            revert AmountError(
                account,
                token_,
                amount_
            );
        }

        accountSafes[account].tokenBalances[token_] -= amount_;

        __setPassword(account, newPasswordHash_);

        token_.safeTransfer(
            account,
            amount_
        );

        emit TokenWithdrawn(account, token_, amount_);
    }

    //=============================================================//
    //                      PRIVATE FUNCTIONS                      //
    //=============================================================//

    function __initPassword(
        address account,
        bytes32 passwordHash_
    ) private {
        accountSafes[account].passwordInitialized = true;
        accountSafes[account].passwordHash = passwordHash_;

        emit PasswordInitialized(account, passwordHash_);
    }

     /**
      * Set password of an account
      * @param newPasswordHash_ New password hash
      */
    function __setPassword(
        address account,
        bytes32 newPasswordHash_
    ) private {
        bytes32 old_password_hash = accountSafes[account].passwordHash;
        if (old_password_hash == newPasswordHash_) {
            revert PasswordSameError(account);
        }

        accountSafes[account].passwordHash = newPasswordHash_;

        emit PasswordChanged(account, old_password_hash, newPasswordHash_);
    }
}
