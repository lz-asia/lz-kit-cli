const { config } = require("hardhat");

async function main() {
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };
    console.log(JSON.stringify(config, null, 2));
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
