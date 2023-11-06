import { normalize } from "path";
import { BigNumber, Contract, Event } from "ethers";
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
} from "../../internal";
import { providers, utils } from "ethers";
import { WriteStream } from "fs";

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

const log = (stream: WriteStream, category: string, ...msg: unknown[]) => {
    stream.write(new Date().toISOString() + "\t" + category + "\t" + msg.join("\t") + "\n");
};

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
        const listener = async (...args: unknown[]) => {
            const event = args[args.length - 1] as Event;
            await handleEvent(
                src,
                destNetworks,
                stream,
                args[0] as string,
                srcNode,
                await event.getTransactionReceipt()
            );
        };
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

const handleEvent = async (
    src: string,
    destNetworks: DestNetwork[],
    stream: WriteStream,
    packet: string,
    srcNode: Contract,
    txReceipt: providers.TransactionReceipt
) => {
    try {
        const { srcChainId, srcUA, destChainId, destUA, nonce, payload } = parsePacket(packet);
        log(stream, src, `event Packet(${srcChainId}, ${srcUA}, ${destChainId}, ${destUA}, ${nonce})`);
        const dest = destNetworks.find(({ lzChainId }) => destChainId == lzChainId);
        if (!dest) {
            log(stream, src, `error: unknown destination chain ${destChainId}`);
            return;
        }
        const relayerParamsEvent = (
            await srcNode.queryFilter("RelayerParams", txReceipt.blockNumber, txReceipt.blockNumber)
        ).find(event => event.transactionHash == txReceipt.transactionHash);
        if (!relayerParamsEvent || !relayerParamsEvent.args) {
            log(stream, src, "error: cannot find event RelayerParams");
            return;
        }
        const { gasLimit, nativeAmount, nativeAddress } = parseAdapterParams(relayerParamsEvent.args[0]);
        log(stream, src, `event RelayerParams(${gasLimit},${nativeAmount},${nativeAddress})`);
        if (nativeAmount && nativeAmount.gt(0) && nativeAddress) {
            const tx = await dest.signer.sendTransaction({ to: nativeAddress, value: nativeAmount });
            log(stream, src, `sent ${utils.formatEther(nativeAmount)} to ${nativeAddress}`);
            log(stream, dest.name, tx.hash);
        }
        const lzApp = new Contract(destUA, abiLzApp, dest.signer);
        const tx = await lzApp.lzReceive(srcChainId, srcUA + destUA.substring(2), nonce, payload, {
            gasLimit,
        });
        log(
            stream,
            dest.name,
            `execute ${lzApp.address}.lzReceive(${srcChainId}, ${srcUA + destUA.substring(2)}, ${nonce}, ${payload})}`
        );
        log(stream, dest.name, tx.hash);
    } catch (e) {
        if (e instanceof Error) {
            const stack = (e as Error).stack;
            if (stack) {
                log(stream, src + ":\t" + stack + "\n");
                return;
            }
        }
        log(stream, src, "error: " + e);
    }
};

const parsePacket = (data: string) => {
    const parser = new HexParser(data);
    const nonce = parser.nextBigNumber(8);
    const srcChainId = parser.nextInt(2);
    const srcUA = parser.nextHexString(20);
    const destChainId = parser.nextInt(2);
    const destUA = parser.nextHexString(20);
    const payload = parser.nextHexString();
    return { nonce, srcChainId, srcUA, destChainId, destUA, payload };
};

const parseAdapterParams = (adapterParams: string) => {
    const parser = new HexParser(adapterParams);
    const type = parser.nextInt(2);
    const params: { gasLimit: BigNumber; nativeAmount?: BigNumber; nativeAddress?: string } = {
        gasLimit: parser.nextBigNumber(32),
    };
    if (type == 2) {
        params.nativeAmount = parser.nextBigNumber(32);
        params.nativeAddress = parser.nextHexString(20);
    }
    return params;
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

    nextBigNumber(bytes?: number) {
        const bigNumber = BigNumber.from(
            "0x" + this.hex.substring(this.offset, bytes ? this.offset + bytes * 2 : this.hex.length)
        );
        if (bytes) {
            this.offset += bytes * 2;
        } else {
            this.offset = this.hex.length;
        }
        return bigNumber;
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
