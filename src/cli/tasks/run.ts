import { execute } from "../../internal";
import { DEFAULT_MNEMONIC } from "../../constants";

interface Options {
    networks: string[];
    mnemonic?: string;
    compile?: boolean;
}

const run = async (script: string, options: Options) => {
    for (const src of options.networks) {
        console.log(`📜 Running ${script} on ` + src + "...");
        for (const dest of options.networks) {
            if (src == dest) continue;
            try {
                await execute(`hardhat run ${options.compile ? "" : "--no-compile"} --network ${src} ${script}`, {
                    LZ_KIT_MNEMONIC: options.mnemonic || DEFAULT_MNEMONIC,
                    LZ_KIT_SRC: src,
                    LZ_KIT_DEST: dest,
                });
            } catch (e) {
                console.trace(e);
            }
        }
    }
};

export default run;
