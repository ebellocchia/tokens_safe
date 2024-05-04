import { Contract, ContractFactory, Signer, utils } from "ethers";
import hre from "hardhat";
import * as constants from "./Constants";

//
// Interfaces
//

export interface AccountSafe {
  passwordInitialized: boolean;
  passwordHash: number;
}

export interface TestContext {
  mock_token: Contract;
  tokens_safe: Contract;
  user_1_account: Signer;
  user_1_address: string;
  user_2_account: Signer;
  user_2_address: string;
}

//
// Exported functions
//

export function computePasswordHash(password: string) : string {
  return utils.keccak256(utils.toUtf8Bytes(password));
}

export async function initTestContext() : Promise<TestContext> {
  const mock_token: Contract = await deployMockERC20TokenContract(constants.TOKEN_SUPPLY);
  const tokens_safe: Contract = await deployTokensSafeContract();
  const signers: Signer[] = await hre.ethers.getSigners();
  const user_1_account: Signer = signers[0];
  const user_1_address: string = await user_1_account.getAddress();
  const user_2_account: Signer = signers[1];
  const user_2_address: string = await user_2_account.getAddress();

  await initERC20Tokens(mock_token, user_1_account, user_2_account);

  return {
    mock_token,
    tokens_safe,
    user_1_account,
    user_1_address,
    user_2_account,
    user_2_address
  };
}

//
// Not exported functions
//

async function initERC20Tokens(
  mock_token: Contract,
  user_1_account: Signer,
  user_2_account: Signer
) : Promise<void> {
  await mock_token.connect(user_1_account).transfer(
    await user_2_account.getAddress(),
    (await mock_token.totalSupply()) / 2
  );
}

async function deployTokensSafeContract() : Promise<Contract> {
  const contract_factory: ContractFactory = await hre.ethers.getContractFactory("TokensSafe");
  const instance: Contract = await contract_factory
    .deploy();
  await instance.deployed();

  return instance;
}

async function deployMockERC20TokenContract(
  initialSupply: number
) : Promise<Contract> {
  const contract_factory: ContractFactory = await hre.ethers.getContractFactory("MockERC20Token");
  const instance: Contract = await contract_factory
    .deploy(initialSupply);
  await instance.deployed();

  return instance;
}
