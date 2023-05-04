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
for src in "${networks[@]}"; do
  for dest in "${networks[@]}"; do
    if [[ "$src" == "$dest" ]]; then
      continue
    fi
    echo "⌛️ running a relayer from $src-fork to $dest-fork"
    logfile=".logs/relayers/$src-fork-$dest-fork.log"
    lz-kit relayer "$src" "$dest" 1>"$logfile" 2>"$logfile" &
  done
done
echo "🔥 All relayers are up"

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
fi
echo "🔥 Configuration done"

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
