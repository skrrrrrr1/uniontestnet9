const Web3 = require('web3');
const readline = require('readline');
require('dotenv').config();

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Union Testnet 9 configurations
const networks = {
  '1': {
    name: 'Union Testnet 9 - Stride',
    rpc: 'https://rpc.uniontestnet9.io/stride',
    address: '0xStrideContractAddressHere'
  },
  '2': {
    name: 'Union Testnet 9 - Babylon',
    rpc: 'https://rpc.uniontestnet9.io/babylon',
    address: '0xBabylonContractAddressHere'
  },
  '3': {
    name: 'Union Testnet 9 - Holesky',
    rpc: 'https://rpc.uniontestnet9.io/holesky',
    address: '0xHoleskyContractAddressHere'
  }
};

// Prompt user for network selection
rl.question('Select the network(s) to send transactions to (1: Stride, 2: Babylon, 3: Holesky, 4: All): ', (networkSelection) => {
  const selectedNetworks = networkSelection.split(',').map(choice => choice.trim());
  const prompts = [];

  // Validate selection and prepare prompts
  selectedNetworks.forEach(choice => {
    if (choice === '4') {
      Object.keys(networks).forEach(key => {
        prompts.push({ network: networks[key], prompt: `Enter the hex string to send for ${networks[key].name}: ` });
      });
    } else if (networks[choice]) {
      prompts.push({ network: networks[choice], prompt: `Enter the hex string to send for ${networks[choice].name}: ` });
    }
  });

  if (prompts.length === 0) {
    console.error('Invalid selection. Please choose a valid option.');
    rl.close();
    return;
  }

  // Private key from .env
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Missing PRIVATE_KEY in .env file');
    rl.close();
    return;
  }

  // Function to handle hex prompts recursively
  const handleHexPrompts = (index = 0, hexStrings = {}) => {
    if (index >= prompts.length) {
      // Setup web3 instances and send transactions
      const sendTransactions = async () => {
        const nonces = {}; // Track nonces for each network

        while (true) { // Infinite loop to keep sending transactions
          for (const { network } of prompts) {
            const web3 = new Web3(network.rpc);
            const account = web3.eth.accounts.privateKeyToAccount(privateKey);
            web3.eth.accounts.wallet.add(account);
            web3.eth.defaultAccount = account.address;

            if (!nonces[network.name]) {
              nonces[network.name] = await web3.eth.getTransactionCount(account.address, 'latest');
            }

            // Function to send transaction
            const sendTransaction = async () => {
              const tx = {
                to: network.address,
                value: '0',
                data: hexStrings[network.name],
                gas: 170000,
                nonce: nonces[network.name]++,
                maxFeePerGas: web3.utils.toWei('2', 'gwei'),
                maxPriorityFeePerGas: web3.utils.toWei('1', 'gwei')
              };

              try {
                const receipt = await web3.eth.sendTransaction(tx);
                console.log(`Transaction on ${network.name} was ${receipt.status ? 'successful' : 'unsuccessful'}`);
              } catch (error) {
                console.error(`Error sending transaction on ${network.name}: ${error.message}`);
                setTimeout(() => sendTransaction(), 5000); // Retry failed transactions after 5 seconds
              }
            };

            await sendTransaction();
            await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s before next transaction
          }
        }
      };

      // Start sending transactions
      sendTransactions();
      rl.close();
    } else {
      const { network, prompt } = prompts[index];
      rl.question(prompt, (hexString) => {
        if (!hexString.startsWith('0x')) {
          hexString = '0x' + hexString;
        }
        hexStrings[network.name] = hexString;
        handleHexPrompts(index + 1, hexStrings);
      });
    }
  };

  handleHexPrompts();
});
