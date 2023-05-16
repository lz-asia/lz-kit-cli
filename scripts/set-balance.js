const { config } = require("hardhat");
const { providers, utils } = require("ethers");
const { deriveWallet } = require("../dist");

async function main() {
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };
    const network = config.networks[process.env.NETWORK];
    if (!network) {
        throw new Error("Cannot find network " + process.env.NETWORK);
    }
    const provider = new providers.JsonRpcProvider(network.url, network.chainId);
    const count = process.env.COUNT || 1;
    for (let i = 0; i < count; i++) {
        const wallet = deriveWallet(provider, process.env.MNEMONIC);
        const address = await wallet.getAddress();
        await provider.send("hardhat_setBalance", [address, utils.hexValue(utils.parseEther(process.env.BALANCE))]);
        console.log("Set balance of " + address + " to " + process.env.BALANCE);
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
