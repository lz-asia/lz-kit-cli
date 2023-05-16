import { DEFAULT_MNEMONIC } from "../constants";
import { execute } from "../utils";
import config from "./config";

interface Options {
    src: string;
    dest: string;
    mnemonic?: string;
    deploy?: boolean;
    config?: string[];
}

const test = async (options: Options) => {
    try {
        if (options.deploy) {
            const mnemonic = options.mnemonic || DEFAULT_MNEMONIC;
            console.log("⌛️ Deploying to " + options.src + "...");
            await execute("hardhat compile");
            await execute(`hardhat deploy --reset --no-compile --network ${options.src}`, {
                MNEMONIC: mnemonic,
            });
            console.log("⌛️ Deploying to " + options.dest + "...");
            await execute(`hardhat deploy --reset --no-compile --network ${options.dest}`, {
                MNEMONIC: mnemonic,
            });
            console.log("🔥 Deployed all contracts");

            if (options.config) {
                console.log("⌛️ Configuring...");
                await config(options.config, {
                    networks: [options.src, options.dest],
                    mnemonic,
                });
                console.log("🔥 Configuration done");
            }
        }

        await execute("hardhat test", {
            SRC_NETWORK: options.src,
            DEST_NETWORK: options.dest,
        });
    } catch (e) {
        console.trace(e);
    }
};

export default test;
