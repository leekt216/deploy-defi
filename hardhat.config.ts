import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
//import "solidity-coverage";
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

export default {
  solidity: {
    compilers :[
      {
        version: "0.6.6",
      },
      {
        version:"0.5.16",
        settings:{
          optimizer: {
            enabled: true,
            runs: 999999
          }
        }
      },
      {
        version: "0.5.17",
        settings: {
          optimizer : {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    coverage: {
      url: 'http://localhost:8555'
    }
  }
};

