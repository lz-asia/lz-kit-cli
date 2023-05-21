import { normalize } from "path";
import { Contract, Event } from "ethers";
import { abi as abiNode } from "../constants/artifacts/UltraLightNodeV2.json";
import { abi as abiLzApp } from "../constants/artifacts/LzApp.json";
import {
    getHardhatNetworkConfig,
    getLZChainId,
    getEndpointAddress,
    getImpersonatedSigner,
    createWriteStream,
    getNodeContract,
    getForkedChainId,
} from "../utils";
import { providers, utils } from "ethers";

interface Options {
    dest: string[];
    node?: string;
}

const relayer = async (src: string, options: Options) => {
    console.log(`⌛️ Spinning up a relayer for ${src}...`);
    try {
        const srcConfig = getHardhatNetworkConfig(src);
        const srcProvider = new providers.JsonRpcProvider(srcConfig.url, srcConfig.chainId);
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
                return { name, chainId, lzChainId, provider, signer };
            })
        );
        const { stream, file } = createWriteStream(normalize(".logs/relayers"), src + ".log");
        stream.write(`${src}:\tlistening...\n`);
        await srcNode.on("*", async (event: Event) => {
            if (event.event != "Packet") return;
            try {
                if (!event.args) {
                    stream.write(`${src}:\tevent doesn't have args\n`);
                    return;
                }
                const { srcChainId, srcUA, destChainId, destUA, nonce, payload } = parsePacket(event.args[0]);
                stream.write(`${src}:\tPacket(${srcChainId}, ${srcUA}, ${destChainId}, ${destUA}, ${nonce})\n`);
                const dest = destNetworks.find(({ lzChainId }) => destChainId == lzChainId);
                if (!dest) {
                    stream.write(`${src}:\tunknown destination chain ${destChainId}\n`);
                    return;
                }
                const lzApp = new Contract(destUA, abiLzApp, dest.signer);
                const tx = await lzApp.lzReceive(srcChainId, srcUA + destUA.substring(2), nonce, payload);
                stream.write(
                    `${dest.name}:\tlzReceive(${srcChainId}, ${srcUA + destUA.substring(2)}, ${nonce}, ${payload})}\n`
                );
                stream.write(dest.name + ":\ttxHash: " + tx.hash + "\n");
            } catch (e) {
                if (e instanceof Error) {
                    const stack = (e as Error).stack;
                    if (stack) {
                        stream.write(src + ":\t" + stack + "\n");
                        return;
                    }
                }
                stream.write(src + ":\t" + e + "\n");
            }
        });
        console.log(`Relayer is up for ${src}, check logs at ${file}`);
    } catch (e) {
        console.trace(e);
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
