import { DEFAULT_MNEMONIC } from "../../constants";
import { getHardhatNetworkConfig, sleep } from "../../utils";
import { providers, utils, Wallet } from "ethers";

interface Options {
    networks: string[];
    mnemonic?: string;
    accounts?: number;
}

const setBalance = async (balance: string, options: Options) => {
    for (const network of options.networks) {
        console.log("⌛️ Setting balance for " + network + "-fork...");
        const config = getHardhatNetworkConfig(network);
        const provider = new providers.JsonRpcProvider(config.url, config.chainId);
        for (let i = 0; i < Number(options.accounts || 1); i++) {
            try {
                await sleep(500); // workaround for 'limit exceeded' error
                const signer = deriveWallet(provider, options.mnemonic || DEFAULT_MNEMONIC, i);
                await sleep(500); // workaround for 'limit exceeded' error
                const address = await signer.getAddress();
                await sleep(500); // workaround for 'limit exceeded' error
                await provider.send("hardhat_setBalance", [address, utils.hexValue(utils.parseEther(balance))]);
                console.log("Set balance of " + address + " to " + balance);
            } catch (e) {
                console.trace(e);
            }
        }
    }
};

const deriveWallet = (provider: providers.Provider, mnemonic: string, index: number) => {
    const path = "m/44'/60'/0'/0/" + (index ? index : "0");
    return Wallet.fromMnemonic(mnemonic, path).connect(provider);
};

export default setBalance;
