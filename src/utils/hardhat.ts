import { execSync } from "child_process";
import { normalize } from "path";
import {
    EthereumProvider,
    HardhatConfig,
    HDAccountsUserConfig,
    HttpNetworkAccountsUserConfig,
    HttpNetworkConfig,
} from "hardhat/types";
import fs from "fs";
import { Deployment } from "hardhat-deploy/dist/types";
import { EIP1193Provider, NetworkConfig } from "hardhat/src/types";

let cachedConfig: HardhatConfig | undefined = undefined;

export const getHardhatConfig = () => {
    if (cachedConfig) return cachedConfig;
    const data = execSync(
        `hardhat run --no-compile ${normalize(__dirname + "/../../scripts/hardhat-config.js")}`
    ).toString();
    const start = data.indexOf("{");
    const end = data.lastIndexOf("}");
    if (start === -1 || end === -1) process.exit(1);
    cachedConfig = JSON.parse(data.substring(start, end + 1)) as HardhatConfig;
    if (!cachedConfig.lzKitEnabled) {
        console.error(
            "⚠️ Error: 'require(\"@lz-kit/cli/hardhat\")' or 'import \"@lz-kit/cli/hardhat\";' is missing in hardhat.config.(js|ts)"
        );
        process.exit(1);
    }
    return cachedConfig;
};

export const getHardhatNetworkConfig = (name: string) => {
    const config = getHardhatConfig().networks[name];
    if (!config) {
        throw new Error(`Network ${name} not found`);
    }
    if (!config.chainId) {
        throw new Error(`Cannot get chainId from network ${name}`);
    }
    if (!("url" in config)) {
        throw new Error(`Cannot get url from network ${name}`);
    }
    return config as HttpNetworkConfig;
};

export const getDeployment = (network: string, contractName: string) => {
    const path = normalize("deployments/" + network + "/" + contractName + ".json");
    if (!fs.existsSync(path)) {
        throw new Error("Cannot find deployment in " + network + " for " + contractName);
    }
    return JSON.parse(fs.readFileSync(path, { encoding: "utf-8" })) as Deployment;
};

export function createProvider(networkName: string, networkConfig: HttpNetworkConfig) {
    const HttpProvider = importProvider<typeof import("hardhat/internal/core/providers/http"), "HttpProvider">(
        "./http",
        "HttpProvider"
    );
    const provider = new HttpProvider(networkConfig.url, networkName, networkConfig.httpHeaders, networkConfig.timeout);

    const wrappedProvider = applyProviderWrappers(provider, networkConfig);

    const BackwardsCompatibilityProviderAdapter = importProvider<
        typeof import("hardhat/internal/core/providers/backwards-compatibility"),
        "BackwardsCompatibilityProviderAdapter"
    >("./backwards-compatibility", "BackwardsCompatibilityProviderAdapter");
    return new BackwardsCompatibilityProviderAdapter(wrappedProvider) as EthereumProvider;
}

function applyProviderWrappers(provider: EIP1193Provider, netConfig: Partial<NetworkConfig>): EIP1193Provider {
    // These dependencies are lazy-loaded because they are really big.
    const LocalAccountsProvider = importProvider<
        typeof import("hardhat/internal/core/providers/accounts"),
        "LocalAccountsProvider"
    >("./accounts", "LocalAccountsProvider");
    const HDWalletProvider = importProvider<
        typeof import("hardhat/internal/core/providers/accounts"),
        "HDWalletProvider"
    >("./accounts", "HDWalletProvider");
    const FixedSenderProvider = importProvider<
        typeof import("hardhat/internal/core/providers/accounts"),
        "FixedSenderProvider"
    >("./accounts", "FixedSenderProvider");
    const AutomaticSenderProvider = importProvider<
        typeof import("hardhat/internal/core/providers/accounts"),
        "AutomaticSenderProvider"
    >("./accounts", "AutomaticSenderProvider");

    const AutomaticGasProvider = importProvider<
        typeof import("hardhat/internal/core/providers/gas-providers"),
        "AutomaticGasProvider"
    >("./gas-providers", "AutomaticGasProvider");
    const FixedGasProvider = importProvider<
        typeof import("hardhat/internal/core/providers/gas-providers"),
        "FixedGasProvider"
    >("./gas-providers", "FixedGasProvider");
    const AutomaticGasPriceProvider = importProvider<
        typeof import("hardhat/internal/core/providers/gas-providers"),
        "AutomaticGasPriceProvider"
    >("./gas-providers", "AutomaticGasPriceProvider");
    const FixedGasPriceProvider = importProvider<
        typeof import("hardhat/internal/core/providers/gas-providers"),
        "FixedGasPriceProvider"
    >("./gas-providers", "FixedGasPriceProvider");
    const ChainIdValidatorProvider = importProvider<
        typeof import("hardhat/internal/core/providers/chainId"),
        "ChainIdValidatorProvider"
    >("./chainId", "ChainIdValidatorProvider");

    if (isResolvedHttpNetworkConfig(netConfig)) {
        const accounts = netConfig.accounts;

        if (Array.isArray(accounts)) {
            provider = new LocalAccountsProvider(provider, accounts);
        } else if (isHDAccountsConfig(accounts)) {
            provider = new HDWalletProvider(
                provider,
                accounts.mnemonic,
                accounts.path,
                accounts.initialIndex,
                accounts.count,
                accounts.passphrase
            );
        }
    }

    if (netConfig.from !== undefined) {
        provider = new FixedSenderProvider(provider, netConfig.from);
    } else {
        provider = new AutomaticSenderProvider(provider);
    }

    if (netConfig.gas === undefined || netConfig.gas === "auto") {
        provider = new AutomaticGasProvider(provider, netConfig.gasMultiplier);
    } else {
        provider = new FixedGasProvider(provider, netConfig.gas);
    }

    if (netConfig.gasPrice === undefined || netConfig.gasPrice === "auto") {
        // If you use a LocalAccountsProvider or HDWalletProvider, your transactions
        // are signed locally. This requires having all of their fields available,
        // including the gasPrice / maxFeePerGas & maxPriorityFeePerGas.
        //
        // We never use those providers when using Hardhat Network, but sign within
        // Hardhat Network itself. This means that we don't need to provide all the
        // fields, as the missing ones will be resolved there.
        //
        // Hardhat Network handles this in a more performant way, so we don't use
        // the AutomaticGasPriceProvider for it.
        if (isResolvedHttpNetworkConfig(netConfig)) {
            provider = new AutomaticGasPriceProvider(provider);
        }
    } else {
        provider = new FixedGasPriceProvider(provider, netConfig.gasPrice);
    }

    if (isResolvedHttpNetworkConfig(netConfig) && netConfig.chainId !== undefined) {
        provider = new ChainIdValidatorProvider(provider, netConfig.chainId);
    }

    return provider;
}

function importProvider<ModuleT, ProviderNameT extends keyof ModuleT>(
    filePath: string,
    name: ProviderNameT
): ModuleT[ProviderNameT] {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(filePath);
    return mod[name];
}

function isResolvedHttpNetworkConfig(netConfig: Partial<NetworkConfig>): netConfig is HttpNetworkConfig {
    return "url" in netConfig;
}
export function isHDAccountsConfig(accounts?: HttpNetworkAccountsUserConfig): accounts is HDAccountsUserConfig {
    return accounts !== undefined && Object.keys(accounts).includes("mnemonic");
}
