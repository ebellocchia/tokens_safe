import { Contract, ContractFactory } from "ethers";
import { task } from "hardhat/config";

task("deploy", "Deploy contract")
  .setAction(async (taskArgs, hre) => {
    console.log("Deploying contract...");

    const tokens_safe_contract_factory: ContractFactory = await hre.ethers.getContractFactory("TokensSafe");
    const tokens_safe_instance: Contract = await tokens_safe_contract_factory
      .deploy();
    await tokens_safe_instance.deployed();

    console.log(`TokensSafe deployed to ${tokens_safe_instance.address}`);
  });
