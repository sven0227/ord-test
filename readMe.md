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