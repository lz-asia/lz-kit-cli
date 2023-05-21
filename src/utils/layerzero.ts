import { Contract, providers } from "ethers";
import { abi as abiEndpoint } from "../constants/artifacts/Endpoint.json";
import { abi as abiNode } from "../constants/artifacts/UltraLightNodeV2.json";
import { endpoint } from "../constants/layerzero.json";
import { getForkedChainId } from "./ethers";

export const getLZChainId = async (endpointAddress: string, provider: providers.Provider) => {
    const endpoint = new Contract(endpointAddress, abiEndpoint, provider);
    let chainId = Number(await endpoint.chainId());
    if (chainId < 100) {
        chainId += 100;
    }
    return chainId;
};

export const getEndpointAddress = (chainId: number) => {
    const address = (endpoint as Record<string, string>)[chainId.toString()];
    if (!address) {
        throw new Error("Cannot find endpoint address for chainId " + chainId);
    }
    return address;
};

export const getNodeContract = async (provider: providers.JsonRpcProvider) => {
    const chainId = await getForkedChainId(provider);
    const endpointAddr = getEndpointAddress(chainId);
    const contract = new Contract(endpointAddr, abiEndpoint, provider);
    const address = await contract.defaultSendLibrary();
    return new Contract(address as string, abiNode, provider);
};
