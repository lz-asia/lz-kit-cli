import { Contract, JsonRpcProvider, JsonRpcSigner, WeiPerEther, Provider } from "ethers";
import { abi as abiEndpoint } from "../constants/artifacts/Endpoint.json";
import { abi as abiNode } from "../constants/artifacts/UltraLightNodeV2.json";
import { abi as abiLzApp } from "../constants/artifacts/LzApp.json";
import { endpoint } from "../constants/layerzero.json";
import { getProvider } from "../providers";
import { ARBITRUM, AVALANCHE, BSC, ETHEREUM, FANTOM, OPTIMISM, POLYGON } from "../constants";

const BASE_PORT = 8000;

const relayer = async (network: string, options: Record<string, string>) => {
    try {
        const { chainId, provider } = await init(network);
        const node = await getNodeContract(provider, chainId - BASE_PORT, options.node);
        console.log(`${network}:\tlistening...`);
        await node.on(node.filters.Packet(), async event => {
            try {
                const { ua, localChainId, remoteChainId, remoteAddress, nonce, payload } = parseData(event.args[0]);
                console.log(`${network}:\temit Packet(${ua}, ${remoteChainId}, ${remoteAddress}, ${nonce} ${payload})`);
                const remoteUa = remoteAddress.substring(0, 42);
                const remoteNetwork = getNetwork(remoteChainId);
                const { chainId, provider, signer } = await init(remoteNetwork);
                console.log(remoteChainId, remoteAddress, remoteNetwork, chainId, await provider.getNetwork());
                const lzApp = new Contract(remoteUa, abiLzApp, signer);
                console.log(localChainId, ua + remoteUa.substring(2), nonce, payload);
                const tx = await lzApp.lzReceive(localChainId, ua + remoteUa.substring(2), nonce, payload);
                console.log(
                    `${remoteNetwork}:\tsent lzReceive(${remoteChainId}, ${remoteAddress}, ${nonce}, ${payload})}`
                );
                console.log(remoteNetwork + "\t" + tx.hash);
                const receipt = await tx.wait();
                console.log(remoteNetwork + "\t" + JSON.stringify(receipt, null, 2));
            } catch (e) {
                console.trace(e);
            }
        });
    } catch (e) {
        console.trace(e);
    }
};

const init = async (network: string) => {
    const chainId = getChainId(network);
    const provider = getProvider(chainId, "http://127.0.0.1:" + chainId + "/");
    const signer = await getImpersonatedSigner(provider, chainId - BASE_PORT);

    return { chainId, provider, signer };
};

const getImpersonatedSigner = async (provider: JsonRpcProvider, chainId: number) => {
    const endpointAddr = (endpoint as Record<string, string>)[chainId.toString()];
    await provider.send("hardhat_impersonateAccount", [endpointAddr]);
    await provider.send("hardhat_setBalance", [endpointAddr, "0x" + (WeiPerEther * 10000n).toString(16)]);
    return new JsonRpcSigner(provider, endpointAddr);
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

const getNetwork = (lzChainId: number) => {
    const network = (
        {
            101: "ethereum",
            102: "bsc",
            106: "avalanche",
            109: "polygon",
            110: "arbitrum",
            111: "optimism",
            112: "fantom",
        } as Record<number, string>
    )[lzChainId];
    if (!network) {
        throw new Error("unsupported chainId " + lzChainId);
    }
    return network;
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

const parseData = (data: string) => {
    const parser = new HexParser(data);
    const nonce = parser.nextInt(8);
    const localChainId = parser.nextInt(2);
    const ua = parser.nextHexString(20);
    const remoteChainId = parser.nextInt(2);
    const remoteAddress = parser.nextHexString(40);
    const payload = parser.nextHexString();
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
