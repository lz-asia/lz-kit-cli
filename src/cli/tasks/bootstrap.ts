import fork from "./fork";
import relayer from "./relayer";
import setBalance from "./setBalance";
import { sleep } from "../../internal";

interface Options {
    mnemonic?: string;
    balance?: string;
    accounts?: number;
    wait?: number;
}

const bootstrap = async (networks: string[], options: Options) => {
    for (const network of networks) {
        await fork(network, {});
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
        await setBalance(options.balance, {
            networks: networks.map(n => n + "-fork"),
            mnemonic: options.mnemonic,
            accounts: options.accounts,
        });
    }
    console.log("🔥 All balances are set");

    console.log();
    console.log("===============================================================================");
    console.log("🎉 Bootstrap completed but DO NOT TERMINATE this process");
    console.log("🌈 Check RPC URLs in hardhat-configs/*.config.json for respective networks");
    console.log("🍀 Leave issues on https://github.com/lz-kit/cli/issues if any!");
    console.log("===============================================================================");
};

export default bootstrap;
