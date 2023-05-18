import { DEFAULT_MNEMONIC } from "../constants";
import { execute } from "../utils";
import deploy from "./deploy";

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
            await deploy({
                networks: [options.src, options.dest],
                mnemonic,
                config: options.config,
            });
        }

        await execute("hardhat test --no-compile", {
            SRC_NETWORK: options.src,
            DEST_NETWORK: options.dest,
        });
    } catch (e) {
        console.trace(e);
    }
};

export default test;
