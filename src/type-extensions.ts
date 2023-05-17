import "hardhat/types/runtime";
import { HttpNetworkConfig } from "hardhat/types";
import { BigNumberish, Contract, providers, Signer, Wallet } from "ethers";

export interface Chain {
    name: string;
    config: HttpNetworkConfig;
    provider: providers.JsonRpcProvider;
    signers: Array<Wallet>;
    getImpersonatedSigner: (address: string, balance?: BigNumberish) => Promise<Signer>;
    getContract: <T extends Contract>(name: string, signer?: Signer) => Promise<T>;
    getContractAt: <T extends Contract>(nameOrAbi: string | unknown[], address: string, signer?: Signer) => Promise<T>;
}

declare module "hardhat/types/runtime" {
    // This is an example of an extension to the Hardhat Runtime Environment.
    // This new field will be available in tasks' actions, scripts, and tests.
    export interface HardhatRuntimeEnvironment {
        srcChain?: Chain;
        destChain?: Chain;
    }
}
