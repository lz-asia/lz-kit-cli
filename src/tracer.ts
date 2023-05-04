import { Network } from "ethers";
import { createClient, Message } from "@layerzerolabs/scan-client";
import { TESTNET_CHAIN_IDS } from "./constants";
import { logFailure, logInfo, logSuccess, getEtherscanTxUrl, startTimer, stopTimer } from "./utils";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const traceMessage = async (srcChainId: number, destChainId: number, srcTxHash: string, interval = 10000) => {
    const srcNetwork = Network.from(srcChainId);
    const destNetwork = Network.from(destChainId);
    logInfo("sending from " + srcNetwork.name + " to " + destNetwork.name);

    const client = createClient(TESTNET_CHAIN_IDS.includes(srcChainId) ? "testnet" : "mainnet");
    logSuccess("txHash: " + getEtherscanTxUrl(srcNetwork, srcTxHash));
    startTimer("tracing message...");

    let message: Message | null = null;
    while (!message) {
        const { messages } = await client.getMessagesBySrcTxHash(srcTxHash);
        if (messages.length > 0) {
            message = messages[0];

            if (message.dstTxHash) {
                if (message.dstTxError) {
                    logFailure("[" + message.status + "] " + message.dstTxError);
                } else {
                    logSuccess("[" + message.status + "] " + getEtherscanTxUrl(destNetwork, message.dstTxHash));
                }
                stopTimer("message delivered");
                break;
            } else {
                logInfo("[" + message.status + "]");
            }
        }
        await sleep(interval);
    }
    return message;
};
