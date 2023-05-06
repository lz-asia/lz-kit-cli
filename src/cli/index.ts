#!/usr/bin/env node

import { program } from "commander";
import fork from "./fork";
import relayer from "./relayer";
import bootstrapForks from "./bootstrap";
import config from "./config";

async function main() {
    program.name("lz-kit").description("Cli tool for LayerZero development").version("0.1.0");
    program
        .command("fork")
        .description("Fork a mainnet network")
        .argument("ethereum|optimism|arbitrum|polygon|bsc|avalanche|fantom", "network to fork")
        .requiredOption("-k, --key <string>", "infura api key")
        .option("-p, --port <number>", "port of json rpc")
        .action(fork);
    program
        .command("relayer")
        .description("Spin up a relayer")
        .argument("ethereum|optimism|arbitrum|polygon|bsc|avalanche|fantom", "source network")
        .option("--node <string>", "UltraLightNode contract for source network")
        .action(relayer);
    program
        .command("config")
        .description("Set trustedRemotes for LZApp contracts")
        .argument("<string>", "LZApp name")
        .requiredOption("-m, --mnemonic <string>", "mnemonic for accounts")
        .requiredOption("-n, --networks <networks...>", "networks to config")
        .action(config);
    program
        .command("bootstrap")
        .description("Fork, run relayers, deploy contracts and config them for given networks")
        .argument("<networks...>", "networks to bootstrap")
        .requiredOption("-m, --mnemonic <string>", "mnemonic for accounts")
        .requiredOption("-k, --key <string>", "infura api key")
        .option("-b, --balance <string>", "balance for first account")
        .option("-w, --wait <number>", "seconds to wait for forks to finish (default: 7)")
        .option("-c, --config <string>", "LZApp name for config")
        .action(bootstrapForks);

    program.parse();
}

main().catch(e => {
    if (process.env.NODE_ENV == "development") {
        console.trace(e);
    } else {
        console.error(e);
    }
    process.exit(1);
});
