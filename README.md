# LZ Kit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This package was created with the aim of boosting productivity for developers who are building innovative projects on LayerZero.

## Getting Started

### Prerequisites

#### Hardhat

LZ Kit was designed for a `hardhat` project so if you didn't setup hardhat, follow this [tutorial](https://hardhat.org/tutorial/creating-a-new-hardhat-project) first.

#### Hardhat Deploy

You also need `hardhat-deploy` plugin to run `lz-kit test`. Follow this [link](https://www.npmjs.com/package/hardhat-deploy) to install it.

### Install

```shell
npm install -g @lz-asia/lz-kit
```

You need to import `@lz-asia/lz-kit/hardhat` in your `hardhat.config.js` or `hardhat.config.ts`:

```shell
import "@lz-asia/lz-kit/hardhat";
```

or

```shell
require("@lz-asia/lz-kit/hardhat");
```

### Usage

Write a cross chain contract e.g. `MyLzApp`:

```solidity
// contracts/MyLzApp.sol

pragma solidity ^0.8.0;

import "@layerzerolabs/solidity-examples/contracts/lzApp/LzApp.sol";

contract MyLzApp {
  constructor(address _lzEndpoint) LzApp(_lzEndpoint) {}

  // ... send and receive functions
}
```

Deployment script is needed:

```typescript
// deploy/00_MyLzApp.ts

import { constants } from "ethers";
import { endpoint } from "../constants/layerzero.json";

export default async ({ getNamedAccounts, deployments, network }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("MyLzApp", {
    from: deployer,
    args: [endpoint[network.name]],
    log: true,
  });
};
```

Write a sample test script:

```typescript
// test/MyLzApp.test.ts

import { utils } from "ethers";
import { srcChain, destChain } from "hardhat";

describe("MyLzApp", function () {
  it("should test", async function () {
    // your testing code
  });
});
```

Set environment variables for reuse:

```shell
INFURA_API_KEY=<your infura api key>
MNEMONIC=<your seed phrase>
```

Bootstrap ethereum, arbitrum and run cross chain tests:

```shell
lz-kit bootstrap -k "$INFURA_API_KEY" --mnemonic "$MNEMONIC" --balance 10000 --accounts 3 ethereum optimism arbitrum &&
lz-kit test -s ethereum-fork -d arbitrum-fork --mnemonic "$MNEMONIC" --deploy --config MyLzApp
```

## Reference

### lz-kit fork

It runs a `hardhat node` that forks a network at `http://127.0.0.1:<port>`.
Default port is 8000 + <Chain ID> (e.g. ethereum-fork: 8001, arbitrum-fork: 50161)

An example to fork ethereum and arbitrum:

```shell
lz-kit fork ethereum -k "$INFURA_API_KEY" &&
lz-kit fork optimism -k "$INFURA_API_KEY" &&
lz-kit fork arbitrum -k "$INFURA_API_KEY"
```

After forking, you'll see new config files under `hardhat-configs/`. We recommend you to add below to your `.gitignore`:

```gitignore
hardhat-configs/
```

As long as you keep those config files under `hardhat-configs/`, you have three additional hardhat networks `ethereum-fork`, `optimism-fork` and `arbitrum-fork` that you can use for testing, even if you didn't specify in your `hardhat.config.js` or `hardhat.config.ts`.

### lz-kit relayer

It runs a relayer that read events from `<source network>` and calls `lzReceive()` of UA contracts on the destination networks.

An example to run relayer on three forked networks:

```shell
lz-kit relayer ethereum-fork --dest arbitrum-fork optimism-fork &&
lz-kit relayer optimism-fork --dest ethereum-fork arbitrum-fork &&
lz-kit relayer arbitrum-fork --dest ethereum-fork optimism-fork
```

Option `--dest` needs to be placed at the end of the command because it accepts variable number of networks.

### lz-bootstrap

It first `lz-kit fork` networks, `lz-kit relayer` for them and sets balance for the first account of each network if needed.

An example to bootstrap all networks, set balance of three accounts of each network to 10000 ETH:

```shell
lz-kit bootstrap -k "$INFURA_API_KEY" --mnemonic "$MNEMONIC" --balance 10000 --accounts 3 ethereum optimism arbitrum
```

Network names need to be placed at the end of the command because it accepts variable number of networks.

### lz-kit config

It sets trusted remotes for all combinations for given networks. The target contract must be a subclass of LzApp.

An example to config all forked networks:

```shell
lz-kit config --mnemonic "$MNEMONIC" ethereum-fork optimism-fork arbitrum-fork
```

Option `--mnemonic` specifies which account to be used when calling `setTrustedRemoteAddress()`.

### lz-kit test

It deploys and configures contracts if needed and run `hardhat test` with additional HRE objects `srcChain` and `destChain`.

It has dependency on `hardhat-deploy` plugin. Also you need to import `@lz-asia/lz-kit/hardhat-plugin` in your `hardhat.config.js` or `hardhat.config.js`.

An example to test cross chain contract on all combinations of forked networks:

```shell
lz-kit test -s ethereum-fork -d optimism-fork --mnemonic "$MNEMONIC" --deploy --config MyLzApp &&
lz-kit test -s ethereum-fork -d arbitrum-fork --mnemonic "$MNEMONIC" --deploy --config MyLzApp &&
lz-kit test -s optimism-fork -d ethereum-fork --mnemonic "$MNEMONIC" --deploy --config MyLzApp &&
lz-kit test -s optimism-fork -d arbitrum-fork --mnemonic "$MNEMONIC" --deploy --config MyLzApp &&
lz-kit test -s arbitrum-fork -d ethereum-fork --mnemonic "$MNEMONIC" --deploy --config MyLzApp &&
lz-kit test -s arbitrum-fork -d optimism-fork --mnemonic "$MNEMONIC" --deploy --config MyLzApp
```

In your test script, you can access `srcChain` and `destChain` as HRE objects. For example:

```typescript
import { utils } from "ethers";
import { srcChain, destChain } from "hardhat";

describe("MyLzApp", function () {
  it("should test", async function () {
    const [deployer, alice, bob, carol] = await srcChain.getSigners();
  });
});
```

`Chain` object is defined as below:

```typescript
interface SignerWithAddress extends Signer {
  address: string;
}

export interface Chain {
  name: string;
  config: HttpNetworkConfig;
  provider: providers.JsonRpcProvider;
  getSigners: () => Promise<Array<SignerWithAddress>>;
  getSigner: (address: string) => Promise<SignerWithAddress>;
  getImpersonatedSigner: (
    address: string,
    balance?: BigNumberish
  ) => Promise<SignerWithAddress>;
  getContract: <T extends Contract>(
    name: string,
    signer?: Signer
  ) => Promise<T>;
  getContractAt: <T extends Contract>(
    nameOrAbi: string | unknown[],
    address: string,
    signer?: Signer
  ) => Promise<T>;
}
```
