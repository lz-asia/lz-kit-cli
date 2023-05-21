import fs from "fs";
import { normalize } from "path";
import { Contract, getAddress, JsonRpcProvider, Wallet, NonceManager } from "ethers6";
import { abi as abiLzApp } from "../constants/artifacts/LzApp.json";
import { DEFAULT_MNEMONIC } from "../constants";
import { getDeployment, getEndpointAddress, getForkedChainId, getHardhatNetworkConfig, getLZChainId } from "../utils";

interface Options {
    networks: string[];
    mnemonic?: string;
}

const config = async (contracts: string[], options: Options) => {
    for (const contract of contracts) {
        console.log("Configuring contract " + contract + "...");
        for (const network of options.networks) {
            try {
                const config = getHardhatNetworkConfig(network);
                const provider = new JsonRpcProvider(config.url, config.chainId);
                const signer = new NonceManager(Wallet.fromPhrase(options.mnemonic || DEFAULT_MNEMONIC, provider));
                const { address } = getDeployment(network, contract);
                const lzApp = new Contract(address, abiLzApp, signer);
                for (const remoteNetwork of options.networks) {
                    if (remoteNetwork == network) continue;
                    if (fs.existsSync(normalize("deployments/" + remoteNetwork))) {
                        await configContract(contract, lzApp, remoteNetwork);
                    }
                }
            } catch (e) {
                console.trace(e);
            }
        }
    }
};

const configContract = async (contractName: string, lzApp: Contract, remoteNetwork: string) => {
    try {
        const config = getHardhatNetworkConfig(remoteNetwork);
        const provider = new JsonRpcProvider(config.url, config.chainId);
        const endpoint = getEndpointAddress(await getForkedChainId(provider));
        const chainId = await getLZChainId(endpoint, provider);
        const { address } = getDeployment(remoteNetwork, contractName);
        const current = await lzApp.trustedRemoteLookup(chainId);
        if (current != "0x" && getAddress(current.substring(0, 42)) == getAddress(address)) {
            console.log("Reusing trusted remote for " + remoteNetwork + ": " + current);
        } else {
            await lzApp.setTrustedRemoteAddress(chainId, address);
            console.log("Updated trusted remote for " + remoteNetwork + ": " + address);
        }
    } catch (e) {
        console.trace(e);
    }
};

export default config;
