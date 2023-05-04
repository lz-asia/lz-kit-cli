import { Contract, JsonRpcProvider, JsonRpcSigner, WeiPerEther, Provider } from "ethers";
import { abi as abiEndpoint } from "../constants/artifacts/Endpoint.json";
import { abi as abiNode } from "../constants/artifacts/UltraLightNodeV2.json";
import { abi as abiReceiver } from "../constants/artifacts/ILayerZeroReceiver.json";
import { endpoint } from "../constants/layerzero.json";
import { getProvider, setDefaultApiKey } from "../providers";
import { ARBITRUM, AVALANCHE, BSC, ETHEREUM, FANTOM, OPTIMISM, POLYGON } from "../constants";
import { logStack, logInfo } from "../utils";

const BASE_PORT = 8000;

const relayer = async (srcNetwork: string, destNetwork: string, options: Record<string, string>) => {
    try {
        const { srcChainId, srcProvider, destChainId, destProvider } = await init(srcNetwork, destNetwork, options);
        const node = await getNodeContract(srcProvider, srcChainId - BASE_PORT, options.node);
        const signer = await getImpersonatedSigner(destProvider, destChainId - BASE_PORT);
        logInfo("relayer listening on " + srcNetwork + "...");
        await node.on(node.filters.Packet(), event => {
            try {
                const { ua, remoteChainId, remoteAddress, nonce, payload } = parseData(event.args[0]);
                const receiver = new Contract(ua, abiReceiver, signer);
                receiver
                    .lzReceive(remoteChainId, remoteAddress, nonce, payload)
                    .then(tx => console.log(tx.hash))
                    .catch(e => console.error(e));
            } catch (e) {
                logStack(e);
            }
        });
    } catch (e) {
        logStack(e);
    }
};

const init = async (srcNetwork: string, destNetwork: string, options: Record<string, string>) => {
    if (options.key) {
        setDefaultApiKey(options.key);
    }
    const srcChainId = options.srcChainId ? Number(options.srcChainId) : getChainId(srcNetwork);
    const srcProvider = getProvider(
        srcChainId,
        options.srcRpcUrl || "http://127.0.0.1:" + getChainId(srcNetwork) + "/"
    );
    const destChainId = options.destChainId ? Number(options.destChainId) : getChainId(destNetwork);
    const destProvider = getProvider(
        destChainId,
        options.destRpcUrl || "http://127.0.0.1:" + getChainId(destNetwork) + "/"
    );

    return { srcChainId, srcProvider, destChainId, destProvider };
};

const getChainId = (network: string) => {
    switch (network) {
        case "ethereum":
            return BASE_PORT + ETHEREUM;
        case "optimism":
            return BASE_PORT + OPTIMISM;
        case "arbitrum":
            return BASE_PORT + ARBITRUM;
        case "polygon":
            return BASE_PORT + POLYGON;
        case "bsc":
            return BASE_PORT + BSC;
        case "avalanche":
            return BASE_PORT + AVALANCHE;
        case "fantom":
            return BASE_PORT + FANTOM;
        default:
            throw new Error("network " + network + " not supported");
    }
};

const getNodeContract = async (provider: Provider, chainId: number, node?: string) => {
    if (node) {
        return new Contract(node as string, abiNode, provider);
    }
    const endpointAddr = (endpoint as Record<string, string>)[chainId.toString()];
    const contract = new Contract(endpointAddr, abiEndpoint, provider);
    const address = await contract.defaultSendLibrary();
    return new Contract(address as string, abiNode, provider);
};

const getImpersonatedSigner = async (provider: JsonRpcProvider, chainId: number) => {
    const endpointAddr = (endpoint as Record<string, string>)[chainId.toString()];
    await provider.send("hardhat_impersonateAccount", [endpointAddr]);
    await provider.send("hardhat_setBalance", [endpointAddr, "0x" + (WeiPerEther * 10000n).toString(16)]);
    return new JsonRpcSigner(provider, endpointAddr);
};

const parseData = (data: string) => {
    const parser = new HexParser(data);
    const nonce = parser.nextInt(8);
    const localChainId = parser.nextInt(2);
    const ua = parser.nextHexString(20);
    const remoteChainId = parser.nextInt(2);
    const remoteAddress = parser.nextHexString(40);
    const payload = parser.nextHexString();
    console.log(nonce, localChainId, ua, remoteAddress, payload);
    return { nonce, localChainId, ua, remoteChainId, remoteAddress, payload };
};

class HexParser {
    offset = 2;

    constructor(public hex: string) {
        if (!hex.startsWith("0x")) {
            this.hex = "0x" + hex;
        }
    }

    nextInt(bytes?: number) {
        const int = parseInt(this.hex.substring(this.offset, bytes ? this.offset + bytes * 2 : this.hex.length), 16);
        if (bytes) {
            this.offset += bytes * 2;
        } else {
            this.offset = this.hex.length;
        }
        return int;
    }

    nextHexString(bytes?: number) {
        const str = "0x" + this.hex.substring(this.offset, bytes ? this.offset + bytes * 2 : this.hex.length);
        if (bytes) {
            this.offset += bytes * 2;
        } else {
            this.offset = this.hex.length;
        }
        return str;
    }
}

export default relayer;
