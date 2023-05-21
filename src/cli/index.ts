#!/usr/bin/env node

import fs from "fs";
import { normalize } from "path";
import { program } from "commander";
import fork from "./fork";
import relayer from "./relayer";
import bootstrap from "./bootstrap";
import config from "./config";
import test from "./test";
import deploy from "./deploy";

const getVersion = () => {
    const { version } = JSON.parse(fs.readFileSync(normalize(__dirname + "/../../package.json"), "utf8"));
    return version;
};

async function main() {
    program.name("lz-kit").description("Cli tool for LayerZero development").version(getVersion());
    program
        .command("fork")
        .description("Fork a mainnet network")
        .argument("<network>", "network to fork (e.g. ethereum)")
        .requiredOption("-k, --key <string>", "infura api key")
        .option("-p, --port <number>", "port of json rpc")
        .action(fork);
    program
        .command("relayer")
        .description("Spin up a relayer")
        .argument("<src>", "source network (e.g. ethereum-fork)")
        .requiredOption("-d, --dest <network...>", "destination network(s) (e.g. arbitrum-fork optimism-fork)")
        .option("--node <address>", "UltraLightNode contract address on source network")
        .action(relayer);
    program
        .command("bootstrap")
        .description("Fork and run relayers for given networks")
        .argument("<network...>", "networks to bootstrap")
        .requiredOption("-k, --key <string>", "infura api key")
        .option("--mnemonic <string>", "mnemonic for accounts")
        .option("--balance <string>", "balance to set for accounts")
        .option("--accounts <number>", "how many accounts to set balance for (default: 1)")
        .option("--wait <number>", "seconds to wait for forks to finish (default: 7)")
        .action(bootstrap);
    program
        .command("config")
        .description("Set trustedRemotes for deployed LZApp contracts")
        .argument("<name...>", "Contract name(s) that extended LZApp")
        .requiredOption("-n, --networks <network...>", "networks to config")
        .option("--mnemonic <string>", "mnemonic for accounts")
        .action(config);
    program
        .command("deploy")
        .description("Deploy contracts and configure them if needed")
        .requiredOption("-n, --networks <network...>", "networks to config")
        .option("--mnemonic <string>", "mnemonic for accounts")
        .option("--config <name...>", "LZApp name(s) for config")
        .action(deploy);
    program
        .command("test")
        .description("Test LzApp contracts")
        .option("-n, --networks <network...>", "networks to config")
        .option("--mnemonic <string>", "mnemonic for accounts")
        .option("--deploy", "if set, deploy and configure contracts")
        .option("--config <name...>", "LZApp name(s) for config")
        .action(test);

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
