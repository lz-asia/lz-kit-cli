import fs from "fs";
import { normalize } from "path";
import { NetworksConfig } from "hardhat/types";
import { providers } from "ethers";
import { BASE_FORKED_CHAIN_ID } from "../../constants";
import { getHardhatNetworkConfig, createWriteStream, getChainId } from "../../utils";
import { executeBackground } from "../../utils";

interface Options {
    chainId?: number;
    port?: number;
}

const fork = async (network: string, options: Options) => {
    console.log("⌛️ Forking network " + network + " ...");
    try {
        const networkConfig = getHardhatNetworkConfig(network);
        const provider = new providers.JsonRpcProvider(networkConfig.url);
        const chainId = Number(options.chainId || (await getChainId(provider)) + BASE_FORKED_CHAIN_ID);
        const port = Number(options.port || chainId);
        const config = generateConfig(chainId, networkConfig.url, port);
        const dir = "hardhat-configs";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        const configFile = normalize(dir + "/" + network + "-fork.config.json");
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2), { flag: "w", encoding: "utf-8" });
        const { file, stream } = createWriteStream(".logs/forks", network + "-fork.log");
        executeBackground(`hardhat node --config ${configFile} --port ${port}`, stream);
        console.log("Forked " + network + ": " + config.networks.localhost.url + ", check logs at " + file);
    } catch (e) {
        console.trace(e);
    }
};

const generateConfig = (chainId: number, url: string, port?: number) => {
    return {
        networks: {
            hardhat: {
                allowUnlimitedContractSize: false,
                chainId,
                forking: {
                    enabled: true,
                    url,
                },
            },
            localhost: {
                chainId,
                url: "http://127.0.0.1:" + port,
            },
        } as NetworksConfig,
    };
};

export default fork;
