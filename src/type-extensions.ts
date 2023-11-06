import "hardhat/types/config";
import "hardhat/types/runtime";
import { BigNumberish, Contract, providers, Signer } from "ethers";
import { HttpNetworkConfig } from "hardhat/types";

export interface SignerWithAddress extends Signer {
    address: string;
}

export interface Snapshot {
    restore: () => Promise<void>;
    id: string;
}

export interface ForkedNetwork {
    chainId: number;
    forkBlockNumber: number;
    forkBlockHash: string;
}

export interface Chain {
    name: string;
    config: HttpNetworkConfig;
    provider: providers.JsonRpcProvider;
    forkedNetwork?: ForkedNetwork;
    lzChainId: number;
    snapshot: Snapshot;
    takeSnapshot: () => Promise<Snapshot>;
    getSigners: () => Promise<Array<SignerWithAddress>>;
    getSigner: (address: string) => Promise<SignerWithAddress>;
    getImpersonatedSigner: (address: string, balance?: BigNumberish) => Promise<SignerWithAddress>;
    getContract: <T extends Contract>(name: string, signer?: Signer) => Promise<T>;
    getContractAt: <T extends Contract>(nameOrAbi: string | unknown[], address: string, signer?: Signer) => Promise<T>;
}

declare module "hardhat/types/config" {
    export interface HardhatConfig {
        lzKitEnabled?: boolean;
    }
}

declare module "hardhat/types/runtime" {
    export interface HardhatRuntimeEnvironment {
        getChain: (name: string) => Promise<Chain | undefined>;
    }
}
