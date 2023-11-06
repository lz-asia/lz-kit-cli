import { execute } from "../../internal";
import config from "./config";
import run from "./run";

interface Options {
    networks: string[];
    mnemonic?: string;
    config?: string[];
    run?: string[];
}

const deploy = async (options: Options) => {
    try {
        const compileCode = await execute("hardhat compile");
        if (compileCode > 0) return;

        for (const network of options.networks) {
            console.log("⌛️ Deploying to " + network + "...");
            const code = await execute(`hardhat deploy --reset --no-compile --network ${network}`, {
                LZ_KIT_MNEMONIC: options.mnemonic || "",
            });
            if (code > 0) return;
        }
        console.log("🔥 Deployed all contracts");

        if (options.config) {
            console.log("⌛️ Configuring...");
            await config(options.config, {
                networks: options.networks,
                mnemonic: options.mnemonic,
            });
            console.log("🔥 Configuration done");
        }

        if (options.run) {
            console.log("⌛️ Executing scripts...");
            for (const script of options.run) {
                await run(script, {
                    networks: options.networks,
                    mnemonic: options.mnemonic,
                });
            }
        }
    } catch (e) {
        console.trace(e);
    }
};

export default deploy;
