import { AVALANCHE, FANTOM, FANTOM_TESTNET, FUJI } from "./constants";
import { EnsPlugin, EtherscanPlugin, GasCostPlugin, InfuraProvider, JsonRpcProvider, Network } from "ethers6";

let defaultApiKey: string;

export const getDefaultApiKey = () => {
    return defaultApiKey;
};

export const setDefaultApiKey = (apiKey: string) => {
    defaultApiKey = apiKey;
};

export const getProvider = (chainId: number, rpcUrl?: string) => {
    if (!rpcUrl) {
        if (chainId == AVALANCHE) {
            rpcUrl = "https://avalanche-mainnet.infura.io/v3/" + getDefaultApiKey();
        } else if (chainId == FUJI) {
            rpcUrl = "https://avalanche-fuji.infura.io/v3/" + getDefaultApiKey();
        } else if (chainId == FANTOM) {
            rpcUrl = "https://rpc.ankr.com/fantom";
        } else if (chainId == FANTOM_TESTNET) {
            rpcUrl = "https://rpc.ankr.com/fantom_testnet";
        }
    }
    const network = Network.from(chainId);
    try {
        return new InfuraProvider(network, defaultApiKey);
    } catch (e) {
        return new JsonRpcProvider(rpcUrl, network);
    }
};

export const registerNetwork = (
    name: string,
    chainId: number,
    etherScanUrl?: string,
    ensAddress?: string,
    ensNetwork?: number
) => {
    const func = function () {
        const network = new Network(name, chainId);
        if (etherScanUrl) {
            network.attachPlugin(new EtherscanPlugin(etherScanUrl));
        }
        if (ensAddress || ensNetwork) {
            network.attachPlugin(new EnsPlugin(ensAddress, ensNetwork));
        }
        network.attachPlugin(new GasCostPlugin());
        return network;
    };

    try {
        Network.from(name);
    } catch (e) {
        Network.register(name, func);
    }
    try {
        return Network.from(chainId);
    } catch (e) {
        Network.register(chainId, func);
        return Network.from(chainId);
    }
};

registerNetwork("avalanche", AVALANCHE, "https://snowtrace.io");
registerNetwork("fuji", FUJI, "https://testnet.snowtrace.io");
registerNetwork("fantom", FANTOM, "https://ftmscan.io");
registerNetwork("fantom-testnet", FANTOM_TESTNET, "https://testnet.ftmscan.io");
