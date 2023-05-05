import fs from "fs";
import { execSync } from "child_process";
import { Contract, getAddress, JsonRpcProvider, Provider, Wallet, NonceManager } from "ethers";
import { abi as abiLzApp } from "../constants/artifacts/LzApp.json";
import { abi as abiEndpoint } from "../constants/artifacts/Endpoint.json";
import { HttpNetworkUserConfig, NetworksConfig } from "hardhat/types";
import { logFailure } from "../utils";

const config = async (contractName: string, options: Record<string, string>) => {
    const data = execSync(`hardhat run ` + __dirname + "/../../scripts/hardhat-networks.js").toString();
    const start = data.indexOf("{");
    const end = data.lastIndexOf("}");
    const networks = JSON.parse(data.substring(start, end + 1)) as NetworksConfig;
    for (const network of options.networks) {
        try {
            const signer = new NonceManager(Wallet.fromPhrase(options.mnemonic, getProvider(networks, network)));
            const lzApp = new Contract(getDeploymentAddress(contractName, network), abiLzApp, signer);
            for (const remoteNetwork of options.networks) {
                if (remoteNetwork == network) continue;
                if (fs.existsSync("deployments/" + remoteNetwork)) {
                    try {
                        const remote = getDeploymentAddress(contractName, remoteNetwork);
                        const remoteChainId = await getLZChainId(remote, getProvider(networks, remoteNetwork));
                        const current = await lzApp.trustedRemoteLookup(remoteChainId);
                        if (current != "0x" && getAddress(current.substring(0, 42)) == getAddress(remote)) {
                            console.log("👉  reusing trusted remote for " + remoteNetwork);
                        } else {
                            await lzApp.setTrustedRemoteAddress(remoteChainId, remote);
                            console.log("✅  updated trusted remote for " + remoteNetwork);
                        }
                    } catch (e) {
                        logFailure((e as Error).message);
                    }
                }
            }
        } catch (e) {
            logFailure((e as Error).message);
        }
    }
};

const getProvider = (networks: NetworksConfig, network: string) => {
    const networkInfo = networks[network] as HttpNetworkUserConfig;
    if (!networkInfo) {
        throw new Error("Cannot find network info with " + network);
    }
    return new JsonRpcProvider(networkInfo.url, networkInfo.chainId);
};

const getDeploymentAddress = (contractName: string, network: string) => {
    const path = "deployments/" + network + "/" + contractName + ".json";
    if (!fs.existsSync(path)) {
        throw new Error("Cannot find deployment in " + network);
    }
    const { address } = JSON.parse(fs.readFileSync(path, { encoding: "utf-8" }));
    return address;
};

const getLZChainId = async (lzAppAddress: string, provider: Provider) => {
    const lzApp = new Contract(lzAppAddress, abiLzApp, provider);
    const endpoint = new Contract(await lzApp.lzEndpoint(), abiEndpoint, provider);
    let chainId = Number(await endpoint.chainId());
    if (chainId < 100) {
        chainId += 100;
    }
    return chainId;
};

export default config;
