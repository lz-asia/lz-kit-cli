const { config } = require("hardhat");
const { providers, utils, Wallet } = require("ethers");

async function main() {
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };
    const network = config.networks[process.env.NETWORK];
    if (!network) {
        throw new Error("Cannot find network " + process.env.NETWORK);
    }
    const provider = new providers.JsonRpcProvider(network.url, network.chainId);
    for (let i = 0; i < (Number(process.env.ACCOUNTS) || 1); i++) {
        const wallet = deriveWallet(provider, process.env.MNEMONIC, i);
        const address = await wallet.getAddress();
        await provider.send("hardhat_setBalance", [address, utils.hexValue(utils.parseEther(process.env.BALANCE))]);
        console.log("Set balance of " + address + " to " + process.env.BALANCE);
    }
}

const deriveWallet = (provider, mnemonic, index) => {
    const path = "m/44'/60'/0'/0/" + (index ? index : "0");
    return Wallet.fromMnemonic(mnemonic, path).connect(provider);
};

main().catch(e => {
    console.error(e);
    process.exit(1);
});
