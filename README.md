# LZ Kit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Make cross-chain development on top of LayerZero easier.

## Getting Started

### Prerequisites

#### Hardhat

LZ Kit was designed to be used for a `hardhat` project so if you didn't setup hardhat, follow
this [tutorial](https://hardhat.org/tutorial/creating-a-new-hardhat-project) first.

#### Hardhat Deploy

You also need to install `hardhat-deploy` plugin to run `lz-kit test`. Follow
this [link](https://www.npmjs.com/package/hardhat-deploy) for details.

### Install

```shell
npm install -g @lz-kit/cli
```

or

```shell
yarn global add @lz-kit/cli
```

You need to import `@lz-kit/cli/hardhat` in your `hardhat.config.js` or `hardhat.config.ts`:

```shell
import "@lz-kit/cli/hardhat";
```

or

```shell
require("@lz-kit/cli/hardhat");
```

Set environment variables for reuse:

```shell
MNEMONIC=<your seed phrase>
```

### Boostrap networks

Bootstrap ethereum, optimism and arbitrum with one command (fork networks and spin up relayers between them):

```shell
lz-kit bootstrap --mnemonic "$MNEMONIC" --balance 10000 --accounts 3 ethereum optimism arbitrum
```

### Deploy & configure contracts

Write a cross chain contract that **extends `LzApp`**:

```solidity
// contracts/MyLzApp.sol

pragma solidity ^0.8.0;

import "@layerzerolabs/solidity-examples/contracts/lzApp/LzApp.sol";

contract MyLzApp is LzApp {
  constructor(address _lzEndpoint) LzApp(_lzEndpoint) {}

  // ... send and receive functions
}
```

Write a deployment script to deploy `MyLzApp`:

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

Deploy contracts, configure trusted remotes with one command
(--config only works if the contract is a subclass of `LzApp`):

````shell

```shell
lz-kit deploy --networks ethereum-fork arbitrum-fork optimism-fork --mnemonic "$MNEMONIC" --config MyLzApp
````

### Testing cross-chain actions

Write a sample test script:

```typescript
// test/MyLzApp.test.ts

import { utils } from "ethers";
import { getChain } from "hardhat";
import { getChainId } from "./ethers";

describe("MyLzApp", function () {
  it("should test", async function () {
    const ethereum = await getChain("ethereum-fork");
    const arbitrum = await getChain("arbitrum-fork");
    const optimism = await getChain("optimism-fork");

    // your testing code
  });
});
```

Run tests:

```shell
lz-kit test --networks ethereum-fork -d arbitrum-fork optimism-fork --mnemonic "$MNEMONIC" --deploy --config MyLzApp
```

## Reference

In your test script, you can access `getChain()` in the HRE object. For example:

```typescript
import { utils } from "ethers";
import { getChain } from "hardhat";

describe("MyLzApp", function () {
  it("should test", async function () {
    const ethereum = await getChain("ethereum-fork");
    const [deployer, alice, bob, carol] = await ethereum.getSigners();
  });
});
```

`Chain` object is defined as below:

```typescript
export interface SignerWithAddress extends Signer {
  address: string;
}

export interface Snapshot {
  restore: () => Promise<void>;
  id: string;
}

export interface ForkedNetwork {
  chainId: number;
  forkBlockNumber: number;
  forkBlockHash: string;
}

export interface Chain {
  name: string;
  config: HttpNetworkConfig;
  provider: providers.JsonRpcProvider;
  forkedNetwork?: ForkedNetwork;
  lzChainId: number;
  snapshot: Snapshot;
  takeSnapshot: () => Promise<Snapshot>;
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
  setBalance: (address: string, balance: BigNumberish) => Promise<void>;
}
```

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Author

[LevX](https://twitter.com/LEVXeth/)
