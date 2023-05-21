import { DEFAULT_MNEMONIC } from "../constants";
import { execute } from "../utils";
import deploy from "./deploy";

interface Options {
    networks?: string[];
    mnemonic?: string;
    deploy?: boolean;
    config?: string[];
}

const test = async (options: Options) => {
    try {
        if (options.deploy) {
            if (!options.networks) {
                console.error("Missing networks");
                return;
            }

            const mnemonic = options.mnemonic || DEFAULT_MNEMONIC;
            await deploy({
                networks: options.networks,
                mnemonic,
                config: options.config,
            });
        }

        await execute("hardhat test --no-compile");
    } catch (e) {
        console.trace(e);
    }
};

export default test;
