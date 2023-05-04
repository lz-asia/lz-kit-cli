import fs from "fs";
import { extendConfig } from "hardhat/config";
import { HardhatConfig } from "hardhat/types";

const dir = "hardhat-configs/";
if (fs.existsSync(dir)) {
    extendConfig((config: HardhatConfig) => {
        for (const file of fs.readdirSync(dir).filter(file => file.endsWith(".config.json"))) {
            const network = JSON.parse(fs.readFileSync(dir + file, { encoding: "utf-8" })).networks.localhost;
            config.networks[file.substring(0, file.length - 12)] = {
                ...network,
                accounts: {
                    mnemonic: process.env.MNEMONIC,
                },
            };
        }
    });
}
