import { normalize } from "path";
import { Contract, Event } from "ethers";
import { abi as abiNode } from "../../constants/artifacts/UltraLightNodeV2.json";
import { abi as abiLzApp } from "../../constants/artifacts/LzApp.json";
import {
    getHardhatNetworkConfig,
    getLZChainId,
    getEndpointAddress,
    getImpersonatedSigner,
    createWriteStream,
    getNodeContract,
    getForkedChainId,
} from "../../utils";
import { providers, utils } from "ethers";
import { WriteStream } from "fs";
import { clearImmediate } from "timers";

interface Options {
    dest: string[];
    node?: string;
}

interface DestNetwork {
    name: string;
    chainId: number;
    lzChainId: number;
    provider: providers.JsonRpcProvider;
    signer: providers.JsonRpcSigner;
}

const LOOP_INTERVAL = 1000;

const log = (stream: WriteStream, category: string, ...msg: unknown[]) => {
    stream.write(new Date().toISOString() + "\t" + category + "\t" + msg.join("\t") + "\n");
};
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const relayer = async (src: string, options: Options) => {
    console.log(`⌛️ Spinning up a relayer for ${src}...`);
    try {
        const srcConfig = getHardhatNetworkConfig(src);
        const srcProvider = new providers.WebSocketProvider(srcConfig.url, srcConfig.chainId);
        const srcNode = options.node
            ? new Contract(options.node, abiNode, srcProvider)
            : await getNodeContract(srcProvider);
        const destNetworks = await Promise.all(
            options.dest.map(async name => {
                const config = getHardhatNetworkConfig(name);
                const provider = new providers.JsonRpcProvider(config.url, config.chainId);
                const chainId = await getForkedChainId(provider);
                const endpoint = getEndpointAddress(chainId);
                const lzChainId = await getLZChainId(endpoint, provider);
                const signer = await getImpersonatedSigner(provider, endpoint, utils.parseEther("10000"));
                return { name, chainId, lzChainId, provider, signer } as DestNetwork;
            })
        );
        const { stream, file } = createWriteStream(normalize(".logs/relayers"), src + ".log");
        log(stream, src, "listening...");
        console.log(`Relayer is up for ${src}, check logs at ${file}`);

        let lastBlock = await srcProvider.getBlockNumber();
        const listener = async (data: string) => await handleEvent(src, destNetworks, stream, data);
        srcProvider.on("block", async (block: number) => {
            if (block < lastBlock) {
                log(stream, src, `evm_revert detected: ${lastBlock} -> ${block}`);
                lastBlock = block;
                srcNode.off("Packet", listener);
                srcNode.on("Packet", listener);
            }
        });
        srcNode.on("Packet", listener);
    } catch (e) {
        console.trace(e);
    }
};

const handleEvent = async (src: string, destNetworks: DestNetwork[], stream: WriteStream, packet: string) => {
    try {
        const { srcChainId, srcUA, destChainId, destUA, nonce, payload } = parsePacket(packet);
        log(stream, src, `event Packet(${srcChainId}, ${srcUA}, ${destChainId}, ${destUA}, ${nonce})`);
        const dest = destNetworks.find(({ lzChainId }) => destChainId == lzChainId);
        if (!dest) {
            log(stream, src, `error: unknown destination chain ${destChainId}`);
            return;
        }
        const lzApp = new Contract(destUA, abiLzApp, dest.signer);
        const tx = await lzApp.lzReceive(srcChainId, srcUA + destUA.substring(2), nonce, payload);
        log(
            stream,
            dest.name,
            `execute ${lzApp.address}.lzReceive(${srcChainId}, ${srcUA + destUA.substring(2)}, ${nonce}, ${payload})}`
        );
        log(stream, dest.name, "tx: " + tx.hash);
    } catch (e) {
        if (e instanceof Error) {
            const stack = (e as Error).stack;
            if (stack) {
                log(stream, src + ":\t" + stack + "\n");
                return;
            }
        }
        log(stream, src, e);
    }
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
