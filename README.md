# LZ Kit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This package was created with the aim of boosting productivity for developers who are building innovative projects on LayerZero.

## Getting Started

### Install

```shell
npm install @lz-asia/lz-kit
```

or

```shell
yarn add @lz-asia/lz-kit
```

### Usage

You need to import `@lz-asia/lz-kit/hardhat-plugin` in your `hardhat.config.js` or `hardhat.config.ts`:

```shell
import "@lz-asia/lz-kit/hardhat-plugin";
```

or

```shell
require("@lz-asia/lz-kit/hardhat-plugin");
```

## lz-kit tasks

`lz-kit` is a CLI that supports forking and running relayers.

### Forking Mainnets

It runs a `hardhat node` that forks a network at `http://127.0.0.1:<port>`.

```shell
Usage: lz-kit fork [options] <ethereum|optimism|arbitrum|polygon|bsc|avalanche|fantom>

Fork a mainnet network

Arguments:
  ethereum|optimism|arbitrum|polygon|bsc|avalanche|fantom  network to fork

Options:
  -k, --key <string>                                       infura api key
  -p, --port <number>                                      port of json rpc
  -h, --help                                               display help for command
```

An example to run multiple networks at once:

```shell
lz-kit fork ethereum -k 84842078b09946638c03157f83405213 &&
lz-kit fork optimism -k 84842078b09946638c03157f83405213 &&
lz-kit fork arbitrum -k 84842078b09946638c03157f83405213 &&
lz-kit fork polygon -k 84842078b09946638c03157f83405213 &&
lz-kit fork bsc -k 84842078b09946638c03157f83405213 &&
lz-kit fork avalanche -k 84842078b09946638c03157f83405213 &&
lz-kit fork fantom -k 84842078b09946638c03157f83405213
```

### Running Relayers

It runs a relayer that read events from `<source network>` and calls `lzReceive()` of UA contracts on the destination chain.

```shell
Usage: lz-kit relayer [options] <ethereum|optimism|arbitrum|polygon|bsc|avalanche|fantom> <ethereum|optimism|arbitrum|polygon|bsc|avalanche|fantom>

Spin up a relayer

Arguments:
  ethereum|optimism|arbitrum|polygon|bsc|avalanche|fantom  source network

Options:
  --node <string>                                          UltraLightNode contract for source network
  -h, --help                                               display help for command
```

An example to run a relayer on forked Ethereum:

```shell
lz-kit relayer ethereum
```

### Configuring Trusted Remotes

It sets trusted remotes for all combinations for given networks. The target contract must be a subclass of LzApp.

```shell
Usage: lz-kit config [options] <string>

Set trustedRemotes for LZApp contracts

Arguments:
  string                        LZApp name

Options:
  -m, --mnemonic <string>       mnemonic for accounts
  -n, --networks <networks...>  networks to config
  -h, --help                    display help for command
```

### Bootstrapping Forked Networks

It first `lz-kit fork` networks and `lz-kit relayer` for them. Then it executes `hardhat deploy` and `lz-kit config` for forked networks.
(It has dependency on `hardhat-deploy` plugin. Also you need to import `@lz-asia/lz-kit/hardhat-plugin` in your `hardhat.config.js` or `hardhat.config.js`).

```shell
Usage: lz-kit bootstrap [options] <networks...>

Fork, run relayers, deploy contracts and config them for given networks

Arguments:
  networks                 networks to bootstrap

Options:
  -m, --mnemonic <string>  mnemonic for accounts
  -k, --key <string>       infura api key
  -b, --balance <string>   balance for first account
  -w, --wait <number>      seconds to wait for forks to finish (default: 7)
  -c, --config <string>    LZApp name for config
  -h, --help               display help for command
```

An example to bootstrap all networks.

```shell
lz-kit bootstrap -k 84842078b09946638c03157f83405213 ethereum optimism arbitrum polygon bsc avalanche fantom
```
