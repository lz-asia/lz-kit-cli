import fs from "fs";
import { providers, Signer, Wallet } from "ethers";
import { extendConfig, extendEnvironment } from "hardhat/config";
import { HardhatConfig, NetworksConfig } from "hardhat/types";
import { HttpNetworkHDAccountsConfig } from "hardhat/src/types/config";
import { Chain } from "./type-extensions";
import "./type-extensions";
import { DEFAULT_MNEMONIC } from "./constants";
import { deriveWallet } from "./utils";

const dir = "hardhat-configs/";
if (fs.existsSync(dir)) {
    extendConfig((config: HardhatConfig) => {
        for (const file of fs.readdirSync(dir).filter(file => file.endsWith(".config.json"))) {
            const network = JSON.parse(fs.readFileSync(dir + file, { encoding: "utf-8" })).networks.localhost;
            config.networks[file.substring(0, file.length - 12)] = {
                ...network,
                accounts: {
                    mnemonic: process.env.MNEMONIC || DEFAULT_MNEMONIC,
                },
            };
        }
    });
}

extendEnvironment(hre => {
    if (process.env.SRC_NETWORK) {
        hre.srcChain = getChain(hre.config.networks, process.env.SRC_NETWORK);
    }
    if (process.env.DEST_NETWORK) {
        hre.destChain = getChain(hre.config.networks, process.env.DEST_NETWORK);
    }
});

const getChain = (networks: NetworksConfig, name: string) => {
    const config = networks[name];
    if (!config || !("url" in config)) return undefined;
    const provider = new providers.JsonRpcProvider(config.url, config.chainId);
    let signers: Signer[];
    if (config.accounts == "remote") {
        throw new Error("remote accounts not supported");
    } else if (Array.isArray(config.accounts)) {
        signers = config.accounts.map(key => new Wallet(key, provider));
    } else {
        const accounts: HttpNetworkHDAccountsConfig = config.accounts;
        signers = Array.from(Array(accounts.count || 20).keys()).map(i => {
            return deriveWallet(provider, accounts.mnemonic, (accounts.initialIndex || 0) + i);
        });
    }

    return {
        name,
        config,
        provider,
        signers,
    } as Chain;
};
