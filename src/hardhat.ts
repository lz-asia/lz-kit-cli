import fs from "fs";
import { BigNumber, BigNumberish, Contract, providers, Signer, utils, Wallet } from "ethers";
import { extendConfig, extendEnvironment } from "hardhat/config";
import { HardhatConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import { HttpNetworkHDAccountsConfig } from "hardhat/src/types/config";
import { Chain } from "./type-extensions";
import "./type-extensions";
import { DEFAULT_MNEMONIC } from "./constants";
import { deriveWallet, getDeployment } from "./utils";

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
        hre.srcChain = getChain(hre, process.env.SRC_NETWORK);
    }
    if (process.env.DEST_NETWORK) {
        hre.destChain = getChain(hre, process.env.DEST_NETWORK);
    }
});

const getChain = (hre: HardhatRuntimeEnvironment, name: string) => {
    const config = hre.config.networks[name];
    if (!config || !("url" in config)) return undefined;

    const provider = new providers.JsonRpcProvider(config.url, config.chainId);
    let signers: Wallet[];
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

    const getImpersonatedSigner = async (address: string, balance?: BigNumberish) => {
        await provider.send("hardhat_impersonateAccount", [address]);
        if (balance) {
            await provider.send("hardhat_setBalance", [
                address,
                utils.hexValue(utils.arrayify(BigNumber.from(balance).toHexString())),
            ]);
        }
        return provider.getSigner(address);
    };

    const getContract = async <T extends Contract>(contractName: string, signer?: Signer) => {
        const { address, abi } = getDeployment(name, contractName);
        return new Contract(address, abi, signer || provider) as T;
    };

    const getContractAt = async <T extends Contract>(
        nameOrAbi: string | unknown[],
        address: string,
        signer?: Signer
    ) => {
        let abi;
        if (typeof nameOrAbi === "string") {
            if (!(await hre.artifacts.artifactExists(nameOrAbi))) {
                throw new Error("Cannot find artifact for " + nameOrAbi);
            }
            const artifact = await hre.artifacts.readArtifact(nameOrAbi);
            abi = artifact.abi;
        } else {
            abi = nameOrAbi;
        }
        return new Contract(address, abi, signer || provider) as T;
    };

    return {
        name,
        config,
        provider,
        signers,
        getImpersonatedSigner,
        getContract,
        getContractAt,
    } as Chain;
};
