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
        const mnemonic = options.mnemonic || DEFAULT_MNEMONIC;
        if (options.deploy) {
            if (!options.networks) {
                console.error("Missing networks");
                return;
            }
            await deploy({
                networks: options.networks,
                mnemonic,
                config: options.config,
            });
        }

        await execute("hardhat test --no-compile", {
            LZ_KIT_MNEMONIC: mnemonic,
        });
    } catch (e) {
        console.trace(e);
    }
};

export default test;
