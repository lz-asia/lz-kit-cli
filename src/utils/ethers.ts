import { JsonRpcProvider, JsonRpcSigner, toQuantity } from "ethers6";

interface ForkedNetwork {
    chainId: number;
    forkBlockNumber: number;
    forkBlockHash: string;
}

export const getForkedChainId = async (provider: JsonRpcProvider) => {
    let chainId = (await getForkedNetwork(provider))?.chainId;
    if (!chainId) {
        chainId = await getChainId(provider);
    }
    return chainId;
};

export const getChainId = async (provider: JsonRpcProvider) => {
    return parseInt(await provider.send("eth_chainId", []), 16);
};

export const getForkedNetwork = async (provider: JsonRpcProvider) => {
    const { forkedNetwork } = await provider.send("hardhat_metadata", []);
    if (!forkedNetwork) {
        throw new Error("Cannot get forked network");
    }
    return forkedNetwork as ForkedNetwork;
};

export const getImpersonatedSigner = async (provider: JsonRpcProvider, account: string, balance?: bigint) => {
    await provider.send("hardhat_impersonateAccount", [account]);
    if (balance) {
        await provider.send("hardhat_setBalance", [account, toQuantity(balance)]);
    }
    return new JsonRpcSigner(provider, account);
};
