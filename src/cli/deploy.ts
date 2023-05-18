import { DEFAULT_MNEMONIC } from "../constants";
import { execute } from "../utils";
import config from "./config";

interface Options {
    networks: string[];
    mnemonic?: string;
    config?: string[];
}

const deploy = async (options: Options) => {
    try {
        const mnemonic = options.mnemonic || DEFAULT_MNEMONIC;
        await execute("hardhat compile");
        for (const network of options.networks) {
            console.log("⌛️ Deploying to " + network + "...");
            await execute(`hardhat deploy --reset --no-compile --network ${network}`, {
                MNEMONIC: mnemonic,
            });
        }
        console.log("🔥 Deployed all contracts");

        if (options.config) {
            console.log("⌛️ Configuring...");
            await config(options.config, {
                networks: options.networks,
                mnemonic,
            });
            console.log("🔥 Configuration done");
        }
    } catch (e) {
        console.trace(e);
    }
};

export default deploy;
