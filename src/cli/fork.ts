import fs from "fs";
import { exec } from "child_process";
import { ARBITRUM, AVALANCHE, BSC, ETHEREUM, FANTOM, OPTIMISM, POLYGON } from "../constants";
import { logStack, logFailure } from "../utils";

const fork = async (network: string, options: Record<string, string>) => {
    try {
        let chainId: number;
        let config;
        switch (network) {
            case "ethereum":
                chainId = 8000 + ETHEREUM;
                config = getConfig(chainId, `https://mainnet.infura.io/v3/${options.key}`);
                break;
            case "optimism":
                chainId = 8000 + OPTIMISM;
                config = getConfig(chainId, `https://optimism-mainnet.infura.io/v3/${options.key}`);
                break;
            case "arbitrum":
                chainId = 8000 + ARBITRUM;
                config = getConfig(chainId, `https://arbitrum-mainnet.infura.io/v3/${options.key}`);
                break;
            case "polygon":
                chainId = 8000 + POLYGON;
                config = getConfig(chainId, `https://polygon-mainnet.infura.io/v3/${options.key}`);
                break;
            case "bsc":
                chainId = 8000 + BSC;
                config = getConfig(chainId, `https://bsc-dataseed1.binance.org`);
                break;
            case "avalanche":
                chainId = 8000 + AVALANCHE;
                config = getConfig(chainId, `https://avalanche-mainnet.infura.io/v3/${options.key}`);
                break;
            case "fantom":
                chainId = 8000 + FANTOM;
                config = getConfig(chainId, `https://rpc.ftm.tools/`);
                break;
            default:
                logFailure("network " + network + " not supported");
                return;
        }

        const dir = "hardhat-configs/";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        const configFile = dir + network + "-fork.config.json";
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2), { flag: "w", encoding: "utf-8" });
        const child = exec(`hardhat node --config ${configFile} --port ${chainId}`);
        child.stdout?.on("data", data => process.stdout.write(data));
        child.stderr?.on("data", data => process.stderr.write(data));
    } catch (e) {
        logStack((e as Error).message);
    }
};

const getConfig = (chainId: number, url: string) => {
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
                url: "http://127.0.0.1:" + chainId,
            },
        },
    };
};

export default fork;
