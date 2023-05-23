import { normalize } from "path";
import fork from "./fork";
import relayer from "./relayer";
import { execute } from "../../utils";
import { DEFAULT_MNEMONIC } from "../../constants";

interface Options {
    key: string;
    mnemonic?: string;
    balance?: string;
    accounts?: number;
    wait?: number;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const bootstrap = async (networks: string[], options: Options) => {
    for (const network of networks) {
        await fork(network, {
            key: options.key,
        });
    }
    await sleep(Number(options.wait || 7) * 1000);
    console.log("🔥 Networks forked");

    for (const network of networks) {
        await relayer(network + "-fork", {
            dest: networks.filter(n => n != network).map(n => n + "-fork"),
        });
    }
    console.log("🔥 All relayers are up");

    if (options.balance) {
        for (const network of networks) {
            console.log("⌛️ Setting balance for " + network + "-fork...");
            const code = await execute(
                `hardhat run --no-compile ${normalize(__dirname + "/../../../scripts/set-balance.js")}`,
                {
                    NETWORK: network + "-fork",
                    MNEMONIC: options.mnemonic || DEFAULT_MNEMONIC,
                    BALANCE: options.balance,
                    ACCOUNTS: String(options.accounts || 1),
                }
            );
            if (code > 0) return;
        }
    }

    console.log();
    console.log("===============================================================================");
    console.log("🎉 Bootstrap completed but DO NOT TERMINATE this process");
    console.log("🌈 Check RPC URLs in hardhat-configs/*.config.json for respective networks");
    console.log("🍀 Leave issues on https://github.com/lz-asia/lz-kit/issues if any!");
    console.log("===============================================================================");
};

export default bootstrap;
