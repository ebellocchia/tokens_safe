# Tokens Safe
[![Build](https://github.com/ebellocchia/tokens_safe/actions/workflows/build.yml/badge.svg)](https://github.com/ebellocchia/tokens_safe/actions/workflows/build.yml)
[![Test](https://github.com/ebellocchia/tokens_safe/actions/workflows/test.yml/badge.svg)](https://github.com/ebellocchia/tokens_safe/actions/workflows/test.yml)

## Introduction

The contract implements the functionality of a simple safe for tokens.\
Accounts can deposit tokens in the contract by setting a password. In order to avoid exposing it, the password hash (i.e. keccak256) is provided to the contract.\
The deposited tokens are held by the contract and can be withdrawn by the owner account by providing the correct password string.
Since the password is exposed at every withdraw (it will be visible as parameter in the transaction), a new password hash is provided each time tokens are withdrawn.

## Setup

Install `yarn` if not installed:

    npm install -g yarn

### Install package

Simply run:

    npm i --include=dev

### Compile

- To compile the contract:

        yarn compile

- To compile by starting from a clean build:

        yarn recompile

### Run tests

- To run tests without coverage:

        yarn test

- To run tests with coverage:

        yarn coverage

### Deploy

To deploy the contract:

    yarn deploy <NETWORK>

### Configuration

Hardhat is configured with the following networks:

|Network name|Description|
|---|---|
|`hardhat`|Hardhat built-in network|
|`locahost`|Localhost network (address: `127.0.0.1:8545`, it can be run with the following command: `yarn run-node`)|
|`bscTestnet`|Zero address|
|`bsc`|BSC mainnet|
|`ethereumSepolia`|ETH testnet (Sepolia)|
|`ethereum`|ETH mainnet|
|`polygonMumbai`|Polygon testnet (Mumbai)|
|`polygon`|Polygon mainnet|

The API keys, RPC nodes and mnemonic shall be configured in the `.env` file.\
You may need to modify the gas limit and price in the Hardhat configuration file for some networks (e.g. Polygon), to successfully execute the transactions (you'll get a gas error).

## Functions

    function computePasswordHash(
        string memory password_
    ) pure returns (bytes32)

Helper function to compute the hash of the given `password_`.\
The password hash is the keccak256 of `password_`.

The function can be called off-chain.

___

    function initPassword(
        bytes32 initPasswordHash_
    )

Initialize the password hash of the caller account to `initPasswordHash_`.\
The function shall be called only at the very beginning, before the first deposit.
If called afterwards, it will revert.

___

    function changePassword(
        string memory currentPassword_,
        bytes32 newPasswordHash_
    )

Change the password hash of the caller account to `newPasswordHash_`.\
The hash of `currentPassword_` shall match the current password hash of the caller account, otherwise the function will revert.\
`newPasswordHash_` shall be different to the current password hash. If it is equal, the function will revert.

___

    function tokenBalance(
        IERC20 token_
    ) view returns (uint256)

Return the balance of token `token_` for the caller account.

___

    function depositToken(
        IERC20 token_,
        uint256 amount_
    )

Deposit amount `amount_` of token `token_` in the contract for the caller account.\
The token can be withdrawn by the caller account only by providing the correct password.

___

    function withdrawToken(
        IERC20 token_,
        uint256 amount_,
        string memory currentPassword_,
        bytes32 newPasswordHash_
    )

Withdraw amount `amount_` of token `token_` from the contract for the caller account.\
By withdrawing the tokens, a new password hash shall be provided since the current password will be exposed in the transaction.

The hash of `currentPassword_` shall match the current password hash of the caller account, otherwise the function will revert.\
`newPasswordHash_` shall be different to the current password hash. If it is equal, the function will revert.

# License

This software is available under the MIT license.
