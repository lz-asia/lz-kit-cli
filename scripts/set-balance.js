const { config } = require("hardhat");
const { JsonRpcProvider, Wallet, parseEther } = require("ethers");

async function main() {
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };
    const network = config.networks[process.env.NETWORK];
    if (!network) {
        throw new Error("cannot find network " + process.env.NETWORK);
    }
    const provider = new JsonRpcProvider(network.url, network.chainId);
    const wallet = Wallet.fromPhrase(process.env.MNEMONIC);
    const address = await wallet.getAddress();
    await provider.send("hardhat_setBalance", [address, "0x" + parseEther(process.env.BALANCE).toString(16)]);
    console.log("set balance of " + address + " to " + process.env.BALANCE);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
