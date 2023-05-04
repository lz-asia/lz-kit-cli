import { exec } from "child_process";

const bootstrap = async (networks: string[], options: Record<string, string>) => {
    const child = exec(
        `MNEMONIC="${options.mnemonic || ""}" INFURA_API_KEY="${options.key || ""}" WAIT=${options.wait || 7} CONFIG="${
            options.config || ""
        }" ${__dirname}/../../scripts/bootstrap-forks.sh ${networks.join(" ")}`
    );
    child.stdout?.on("data", data => process.stdout.write(data));
    child.stderr?.on("data", data => process.stderr.write(data));
};

export default bootstrap;
