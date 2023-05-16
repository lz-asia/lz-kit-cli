import "hardhat/types/runtime";
import { HttpNetworkConfig } from "hardhat/types";
import { providers, Signer } from "ethers";

export interface Chain {
    name: string;
    config: HttpNetworkConfig;
    provider: providers.JsonRpcProvider;
    signers: Array<Signer>;
}

declare module "hardhat/types/runtime" {
    // This is an example of an extension to the Hardhat Runtime Environment.
    // This new field will be available in tasks' actions, scripts, and tests.
    export interface HardhatRuntimeEnvironment {
        srcChain?: Chain;
        destChain?: Chain;
    }
}
