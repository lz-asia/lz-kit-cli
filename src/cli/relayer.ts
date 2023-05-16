import { Contract, JsonRpcProvider, Provider, parseEther } from "ethers6";
import { abi as abiEndpoint } from "../constants/artifacts/Endpoint.json";
import { abi as abiNode } from "../constants/artifacts/UltraLightNodeV2.json";
import { abi as abiLzApp } from "../constants/artifacts/LzApp.json";
import { endpoint } from "../constants/layerzero.json";
import {
    getHardhatNetworkConfig,
    getLZChainId,
    getEndpointAddress,
    getImpersonatedSigner,
    createWriteStream,
    getForkedNetwork,
} from "../utils";
import HexParser from "../utils/HexParser";

interface Options {
    dest: string[];
    node?: string;
}

const relayer = async (src: string, options: Options) => {
    console.log(`⌛️ Spinning up a relayer for ${src}...`);
    try {
        const srcConfig = getHardhatNetworkConfig(src);
        const srcProvider = new JsonRpcProvider(srcConfig.url, srcConfig.chainId);
        const { chainId: srcChainId } = await getForkedNetwork(srcProvider);
        const srcNode = await getNodeContract(srcProvider, srcChainId, options.node);
        const destNetworks = await Promise.all(
            options.dest.map(async name => {
                const config = getHardhatNetworkConfig(name);
                const provider = new JsonRpcProvider(config.url, config.chainId);
                const { chainId } = await getForkedNetwork(provider);
                const endpoint = getEndpointAddress(chainId);
                const lzChainId = await getLZChainId(endpoint, provider);
                const signer = await getImpersonatedSigner(provider, endpoint, parseEther("10000"));
                return { name, chainId, lzChainId, provider, signer };
            })
        );
        const { stream } = createWriteStream(".logs/relayers", src + ".log");
        stream.write(`${src}:\tlistening...\n`);
        await srcNode.on(srcNode.filters.Packet(), async event => {
            try {
                const { srcChainId, srcUA, destChainId, destUA, nonce, payload } = parsePacket(event.args[0]);
                const dest = destNetworks.find(({ lzChainId }) => destChainId == lzChainId);
                if (!dest) {
                    stream.write(`${src}:\tunknown destination chain ${destChainId}\n`);
                    return;
                }
                const lzApp = new Contract(destUA, abiLzApp, dest.signer);
                const tx = await lzApp.lzReceive(srcChainId, srcUA + destUA.substring(2), nonce, payload);
                stream.write(
                    `${dest}:\tlzReceive(${srcChainId}, ${srcUA + destUA.substring(2)}, ${nonce}, ${payload})}\n`
                );
                stream.write(dest + "\ttxHash: " + tx.hash + "\n");
            } catch (e) {
                if (e instanceof Error) {
                    const stack = (e as Error).stack;
                    if (stack) {
                        stream.write(stack + "\n");
                        return;
                    }
                }
                stream.write(e + "\n");
            }
        });
        console.log(`Relayer is up for ${src}, check logs at .logs/relayers/${src}.log`);
    } catch (e) {
        console.trace(e);
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

const parsePacket = (data: string) => {
    const parser = new HexParser(data);
    const nonce = parser.nextInt(8);
    const srcChainId = parser.nextInt(2);
    const srcUA = parser.nextHexString(20);
    const destChainId = parser.nextInt(2);
    const destUA = parser.nextHexString(20);
    const payload = parser.nextHexString();
    return { nonce, srcChainId, srcUA, destChainId, destUA, payload };
};

export default relayer;
