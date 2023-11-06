import fs from "fs";
import { join } from "path";
import { BigNumberish, Contract, providers, Signer, utils } from "ethers";
import { extendConfig, extendEnvironment } from "hardhat/config";
import { EthereumProvider, HardhatConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import { DEFAULT_MNEMONIC } from "./constants";
import { Chain } from "./type-extensions";
import "./type-extensions";
import {
    createProvider,
    getDeployment,
    getEndpointAddress,
    getForkedNetwork,
    getImpersonatedSigner as _getImpersonatedSigner,
    getLZChainId,
} from "./internal";

(function () {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ctx = global.__hardhatContext;
    if (!ctx?.environmentExtenders) {
        console.error("⚠️ Error: This version of hardhat is not supported so upgrade your hardhat >= 2.16.0");
        process.exit(0);
    }

    const dir = "hardhat-configs";
    if (fs.existsSync(dir)) {
        extendConfig((config: HardhatConfig) => {
            config.lzKitEnabled = true;
            for (const file of fs.readdirSync(dir).filter(file => file.endsWith(".config.json"))) {
                const network = JSON.parse(fs.readFileSync(join(dir, file), { encoding: "utf-8" })).networks.localhost;
                config.networks[file.substring(0, file.length - 12)] = {
                    ...network,
                    accounts: process.env.LZ_KIT_MNEMONIC
                        ? {
                              mnemonic: process.env.LZ_KIT_MNEMONIC || DEFAULT_MNEMONIC,
                          }
                        : network.accounts,
                };
            }
        });
    }

    extendEnvironment(hre => {
        hre.getChain = async (name: string) => await getChain(hre, name);
    });
})();

const getChain = async (hre: HardhatRuntimeEnvironment, name: string) => {
    const config = hre.config.networks[name];
    if (!config) throw new Error("Cannot find network " + name);
    if (!("url" in config)) throw new Error("Missing 'url' for network " + name);
    const provider = new EthereumProviderWrapper(createProvider(name, config), config.url, config.chainId);
    const forkedNetwork = await getForkedNetwork(provider);
    const lzChainId = await getLZChainId(
        getEndpointAddress(forkedNetwork?.chainId || provider.network.chainId),
        provider
    );

    const takeSnapshot = async () => {
        const id = (await provider.send("evm_snapshot", [])) as string;
        return {
            id,
            restore: async () => {
                const reverted = (await provider.send("evm_revert", [id])) as boolean;
                if (!reverted) {
                    throw new Error("Invalid snapshot id");
                }
            },
        };
    };
    const snapshot = await takeSnapshot();

    const getSigners = async () => {
        const accounts = await provider.listAccounts();
        return await Promise.all(accounts.map(account => getSigner(account)));
    };

    const getSigner = async (address: string) => {
        const signer = provider.getSigner(address);
        return await SignerWithAddress.create(signer);
    };

    const getImpersonatedSigner = async (address: string, balance?: BigNumberish) => {
        const signer = await _getImpersonatedSigner(provider, address, balance);
        return await SignerWithAddress.create(signer);
    };

    const getContract = async <T extends Contract>(contractName: string, signer?: Signer) => {
        const { address, abi } = getDeployment(name, contractName);
        return new Contract(address, abi, signer || provider) as T;
    };

    const getContractAt = async <T extends Contract>(
        nameOrAbi: string | unknown[],
        address: string,
        signer?: Signer
    ) => {
        let abi;
        if (typeof nameOrAbi === "string") {
            if (!(await hre.artifacts.artifactExists(nameOrAbi))) {
                throw new Error("Cannot find artifact for " + nameOrAbi);
            }
            const artifact = await hre.artifacts.readArtifact(nameOrAbi);
            abi = artifact.abi;
        } else {
            abi = nameOrAbi;
        }
        return new Contract(address, abi, signer || provider) as T;
    };

    const setBalance = async (address: string, balance: BigNumberish) => {
        await provider.send("hardhat_setBalance", [address, utils.hexValue(balance)]);
    };

    return {
        name,
        config,
        provider,
        forkedNetwork,
        lzChainId,
        snapshot,
        takeSnapshot,
        getSigners,
        getSigner,
        getImpersonatedSigner,
        getContract,
        getContractAt,
        setBalance,
    } as Chain;
};

class EthereumProviderWrapper extends providers.JsonRpcProvider {
    private readonly _provider: EthereumProvider;

    constructor(provider: EthereumProvider, url: string, chainId?: number) {
        super(url, chainId);
        this._provider = provider;
    }

    public async send(method: string, params: Array<unknown>): Promise<unknown> {
        try {
            return await this._provider.send(method, params);
        } catch (e) {
            // fallback for impersonated accounts (without local private keys)
            if (
                method == "eth_sign" ||
                method == "personal_sign" ||
                method == "eth_signTypedData_v4" ||
                method == "eth_sendTransaction"
            ) {
                return await super.send(method, params);
            }
            throw e;
        }
    }

    public toJSON() {
        return "<EthereumProviderWrapper>";
    }
}

class SignerWithAddress extends Signer {
    public static async create(signer: providers.JsonRpcSigner) {
        return new SignerWithAddress(await signer.getAddress(), signer);
    }

    private constructor(public readonly address: string, private readonly _signer: providers.JsonRpcSigner) {
        super();
        (this as any).provider = _signer.provider;
    }

    public async getAddress(): Promise<string> {
        return this.address;
    }

    public signMessage(message: string | utils.Bytes): Promise<string> {
        return this._signer.signMessage(message);
    }

    public signTransaction(transaction: utils.Deferrable<providers.TransactionRequest>): Promise<string> {
        return this._signer.signTransaction(transaction);
    }

    public sendTransaction(
        transaction: utils.Deferrable<providers.TransactionRequest>
    ): Promise<providers.TransactionResponse> {
        return this._signer.sendTransaction(transaction);
    }

    public connect(provider: providers.Provider): SignerWithAddress {
        return new SignerWithAddress(this.address, this._signer.connect(provider));
    }

    public _signTypedData(...params: Parameters<providers.JsonRpcSigner["_signTypedData"]>): Promise<string> {
        return this._signer._signTypedData(...params);
    }

    public toJSON() {
        return `<SignerWithAddress ${this.address}>`;
    }
}
