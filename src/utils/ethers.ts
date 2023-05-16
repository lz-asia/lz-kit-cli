import { JsonRpcProvider, JsonRpcSigner, toQuantity } from "ethers6";
import { providers, Wallet } from "ethers";

interface ForkedNetwork {
    chainId: number;
    forkBlockNumber: number;
    forkBlockHash: string;
}

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

export const deriveWallet = (provider: providers.Provider, mnemonic: string, index?: number) => {
    const path = "m/44'/60'/0'/0/" + (index ? index : "0");
    return Wallet.fromMnemonic(mnemonic, path).connect(provider);
};
