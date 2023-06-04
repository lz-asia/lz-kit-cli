import { BigNumberish, providers, utils } from "ethers";

interface ForkedNetwork {
    chainId: number;
    forkBlockNumber: number;
    forkBlockHash: string;
}

export const getForkedChainId = async (provider: providers.JsonRpcProvider, fallback = true) => {
    let chainId = (await getForkedNetwork(provider))?.chainId;
    if (!chainId && fallback) {
        chainId = await getChainId(provider);
    }
    if (!chainId) {
        throw new Error("Cannot get chainId");
    }
    return chainId;
};

export const getChainId = async (provider: providers.JsonRpcProvider) => {
    return parseInt(await provider.send("eth_chainId", []), 16);
};

const cachedForkedNetworks: { [chainId: number]: ForkedNetwork } = {};

export const getForkedNetwork = async (provider: providers.JsonRpcProvider) => {
    const cache = cachedForkedNetworks[provider.network.chainId];
    if (cache) {
        return cache;
    }
    const { forkedNetwork } = await provider.send("hardhat_metadata", []);
    if (forkedNetwork) {
        cachedForkedNetworks[provider.network.chainId] = forkedNetwork as ForkedNetwork;
        return forkedNetwork as ForkedNetwork;
    }
};

export const getImpersonatedSigner = async (
    provider: providers.JsonRpcProvider,
    account: string,
    balance?: BigNumberish
) => {
    await provider.send("hardhat_impersonateAccount", [account]);
    if (balance) {
        await provider.send("hardhat_setBalance", [account, utils.hexValue(balance)]);
    }
    return provider.getSigner(account);
};
