import fs from "fs";
import { BigNumber, BigNumberish, Contract, providers, Signer, utils } from "ethers";
import { extendConfig, extendEnvironment } from "hardhat/config";
import { EthereumProvider, HardhatConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import { Chain } from "./type-extensions";
import "./type-extensions";
import { DEFAULT_MNEMONIC } from "./constants";
import { getDeployment } from "./utils";
import { createProvider } from "hardhat/internal/core/providers/construction";

const dir = "hardhat-configs/";
if (fs.existsSync(dir)) {
    extendConfig((config: HardhatConfig) => {
        for (const file of fs.readdirSync(dir).filter(file => file.endsWith(".config.json"))) {
            const network = JSON.parse(fs.readFileSync(dir + file, { encoding: "utf-8" })).networks.localhost;
            config.networks[file.substring(0, file.length - 12)] = {
                ...network,
                accounts: {
                    mnemonic: process.env.MNEMONIC || DEFAULT_MNEMONIC,
                },
            };
        }
    });
}

extendEnvironment(hre => {
    hre.getChain = (name: string) => getChain(hre, name);
});

const getChain = (hre: HardhatRuntimeEnvironment, name: string) => {
    const config = hre.config.networks[name];
    if (!config) throw new Error("Cannot find network " + name);
    const provider = new EthersProviderWrapper(createProvider(name, config));

    const getSigners = async () => {
        const accounts = await provider.listAccounts();
        return await Promise.all(accounts.map(account => getSigner(account)));
    };

    const getSigner = async (address: string) => {
        const signer = provider.getSigner(address);
        return await SignerWithAddress.create(signer);
    };

    const getImpersonatedSigner = async (address: string, balance?: BigNumberish) => {
        await provider.send("hardhat_impersonateAccount", [address]);
        if (balance) {
            await provider.send("hardhat_setBalance", [
                address,
                utils.hexValue(utils.arrayify(BigNumber.from(balance).toHexString())),
            ]);
        }
        return getSigner(address);
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

    return {
        name,
        config,
        provider,
        getSigners,
        getSigner,
        getImpersonatedSigner,
        getContract,
        getContractAt,
    } as Chain;
};

class EthersProviderWrapper extends providers.JsonRpcProvider {
    private readonly _hardhatProvider: EthereumProvider;

    constructor(hardhatProvider: EthereumProvider) {
        super();
        this._hardhatProvider = hardhatProvider;
    }

    public async send(method: string, params: any): Promise<any> {
        return await this._hardhatProvider.send(method, params);
    }

    public toJSON() {
        return "<WrappedHardhatProvider>";
    }
}

class SignerWithAddress extends Signer {
    public static async create(signer: providers.JsonRpcSigner) {
        return new SignerWithAddress(await signer.getAddress(), signer);
    }

    _initialPromise?: Promise<number>;
    _deltaCount: number;

    private constructor(public readonly address: string, private readonly _signer: providers.JsonRpcSigner) {
        super();
        (this as any).provider = _signer.provider;
        this._deltaCount = 0;
    }

    public async getAddress(): Promise<string> {
        return this.address;
    }

    public getTransactionCount(blockTag?: providers.BlockTag): Promise<number> {
        if (blockTag === "pending") {
            if (!this._initialPromise) {
                this._initialPromise = this._signer.getTransactionCount("pending");
            }
            const deltaCount = this._deltaCount;
            return this._initialPromise.then(initial => initial + deltaCount);
        }

        return this._signer.getTransactionCount(blockTag);
    }

    public setTransactionCount(transactionCount: BigNumberish | Promise<BigNumberish>): void {
        this._initialPromise = Promise.resolve(transactionCount).then(nonce => {
            return BigNumber.from(nonce).toNumber();
        });
        this._deltaCount = 0;
    }

    public incrementTransactionCount(count?: number): void {
        this._deltaCount += count == null ? 1 : count;
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
        if (transaction.nonce == null) {
            transaction = utils.shallowCopy(transaction);
            transaction.nonce = this.getTransactionCount("pending");
            this.incrementTransactionCount();
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.setTransactionCount(transaction.nonce);
            this._deltaCount++;
        }

        return this._signer.sendTransaction(transaction).then(tx => {
            return tx;
        });
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
