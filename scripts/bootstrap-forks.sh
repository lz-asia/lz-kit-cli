#!/bin/bash

networks=( "$@" )

echo "⌛️ Forking networks"
mkdir -p .logs/forks
for network in "${networks[@]}"; do
  logfile=".logs/forks/$network-fork.log"
  lz-kit fork -k "$INFURA_API_KEY" "$network" 1>"$logfile" 2>"$logfile" &
done
sleep "$WAIT"
echo "🔥 Networks forked"

# Run relayers
mkdir -p .logs/relayers
for network in "${networks[@]}"; do
  echo "⌛️ running a relayer for $network-fork"
  logfile=".logs/relayers/$network-fork.log"
  lz-kit relayer "$network" 1>"$logfile" 2>"$logfile" &
done
echo "🔥 All relayers are up"

# Set balance for first account
if [[ "$BALANCE" ]]; then
  for network in "${networks[@]}"; do
    echo "⌛️ setting balance for $network-fork"
     NETWORK="$network-fork" MNEMONIC="$MNEMONIC" BALANCE="$BALANCE" hardhat run --no-compile "$( dirname -- "$BASH_SOURCE" )"/set-balance.js
  done
fi

# Deploy contracts to forks
hardhat compile
for network in "${networks[@]}"; do
  echo "⌛️ deploying to $network-fork"
  MNEMONIC="$MNEMONIC" hardhat deploy --no-compile --reset --network "$network-fork"
done
echo "🔥 Contracts deployed"

# Configure contracts
if [[ "$CONFIG" && "$MNEMONIC" ]]; then
  forks=( "${networks[@]/%/-fork}" )
  lz-kit config "$CONFIG" --mnemonic "$MNEMONIC" --networks "${forks[@]}"
  echo "🔥 Configuration done"
else
  echo "ℹ️ Skipping configuration (if you want it, specify --config option)"
fi

echo "==============================================================================="
echo "🎉 Bootstrap completed but DO NOT TERMINATE this process"
echo "🌈 Check RPC URLs in .logs/forks/*.log for respective networks"
echo "🍀 Leave issues on https://github.com/lz-asia/lz-kit/issues if any!"
echo "==============================================================================="

# Clean up forks when exiting the script
clear() {
  ps ax | grep "node_modules/.bin/hardhat" | grep -v "grep" | awk '{print $1}' | xargs kill -9
}
trap clear EXIT
wait
