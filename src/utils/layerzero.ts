import { Contract, Provider } from "ethers6";
import { abi } from "../constants/artifacts/Endpoint.json";
import { endpoint } from "../constants/layerzero.json";

export const getEndpointAddress = (chainId: number) => {
    const address = (endpoint as Record<string, string>)[chainId.toString()];
    if (!address) {
        throw new Error("Cannot find endpoint address for chainId " + chainId);
    }
    return address;
};

export const getLZChainId = async (endpointAddress: string, provider: Provider) => {
    const endpoint = new Contract(endpointAddress, abi, provider);
    let chainId = Number(await endpoint.chainId());
    if (chainId < 100) {
        chainId += 100;
    }
    return chainId;
};
