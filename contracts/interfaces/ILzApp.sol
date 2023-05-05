// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ILzApp {
    error Forbidden();
    error NoTrustedRemote();
    error MinGasLimitNotSet();
    error GasLimitTooLow();
    error InvalidAdapterParams();
    error NoTrustedPathRecord();
    error InvalidMinGas();
    error PayloadTooLarge();
}
