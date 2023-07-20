# addresses
  temp address = 
    Mainnet : ''
    Testnet : ''
  

# ord CLI
  ## 
  ord --testnet wallet send --fee-rate 1 tb1qu9ud2zct3m4s6ljvwqdk5sumf4vpdqtv4zulpr 1000sats

  ord --testnet wallet inscribe --fee-rate 1 --destination bc1qu9ud2zct3m4s6ljvwqdk5sumf4vpdqtvly8v6s --satpoint 7fe7f4c7e89a23cbdb978baa988172430f694801befa6738005a19b3d7d10be1:0:6 ./inscription.txt

  ord --chain mainnet wallet send --fee-rate 6  bc1qu9ud2zct3m4s6ljvwqdk5sumf4vpdqtvly8v6s 1000sats

  ord wallet inscribe --fee-rate 6 --destination bc1qu9ud2zct3m4s6ljvwqdk5sumf4vpdqtvly8v6s ./inscription.txt
  ord wallet inscribe --fee-rate 6 ./inscription.txt --dry-run

# bitcoin-cli
  Bitcoin-cli createwallet “newwalletname” 
  bitcoin-cli getnewaddress
  bitcoin-cli -rpcwallet=ord listreceivedbyaddress 0 true


# sample env
NETWORK=testnet
TEMP_WALLET_NAME=temp

# wallet create
root@135-181-213-142 /ord-test # ord wallet create
{
  "mnemonic": "budget glove swift pulp bracket kite crane onion series trouble ozone vote",
  "passphrase": ""
}
## ord wallet
root@135-181-213-142 /ord-test # ord --wallet temp wallet create
{
  "mnemonic": "copy visit crack egg jeans setup certain anger canoe dilemma behave weekend",
  "passphrase": ""
}
## temp wallet for send many
root@135-181-213-142 /ord-test # ord --wallet temp wallet receive
{
  "address": "bc1pyzcr3wv7paquxefr092sjn77tt7cmnu76xgeg9hujw50337a0lxsn23kar"
}
## temp wallet testnet create
root@135-181-213-142 /ord-test # ord --testnet --wallet temp wallet create
{
  "mnemonic": "lumber humor family math brass laugh space shield addict hotel ethics brown",
  "passphrase": ""
}
## temp wallet testnet address
root@135-181-213-142 /ord-test # ord --testnet --wallet temp wallet receive
{
  "address": "tb1pxxfcu0puxfqnf6aart0ve3gsj93fy6lumcy5uyc7ycvr2029gces4sgx80"
}