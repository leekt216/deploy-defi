// got from nexusmutual/smart-contracts and changed to typescript
import { ethers } from 'hardhat';
import { Contract, ContractFactory, Signer } from "ethers";
import { ether, time } from "@openzeppelin/test-helpers";
//const { assert } = require('chai');
const { hex } = require('./utils');

const QE = '0x51042c4d8936a7764d18370a6a0762b860bb8e07';
const INITIAL_SUPPLY = ether('1500000');
const EXCHANGE_TOKEN = ether('10000');
const EXCHANGE_ETHER = ether('10');
const POOL_ETHER = ether('3500');
const POOL_DAI = ether('900000');

async function getProxyFromMaster(master: Contract, contract: ContractFactory, code: string) : Promise<Contract> {
  const address = await master.getLatestAddress(hex(code));
  return contract.attach(address);
};

interface NexusMutual {
  master: Contract;
  nxm: Contract;
  claims: Contract;
  claimsData: Contract;
  claimsReward: Contract;
  mcr: Contract;
  tokenData: Contract;
  tokenFunctions: Contract;
  tokenController: Contract;
  pool1: Contract;
  pool2: Contract;
  poolData: Contract;
  quotation: Contract;
  quotationData: Contract;
  governance: Contract;
  proposalCategory: Contract;
  memberRoles: Contract;
  pooledStaking: Contract;
}

export async function deploy(deployer: Signer, dai: Contract, mkr: Contract, uniswapFactory: Contract) : Promise<NexusMutual> {
  //to determine the owner
  const owner = await deployer.getAddress();
  // external
  const OwnedUpgradeabilityProxy = await ethers.getContractFactory('OwnedUpgradeabilityProxy');

  // dai chainlink price link
  const DSValue = await ethers.getContractFactory('NXMDSValueMock');
  const dsv = await DSValue.deploy(owner);
  // nexusmutual
  const NXMToken = await ethers.getContractFactory('NXMToken');
  const NXMaster = await ethers.getContractFactory('NXMasterMock');
  const Claims = await ethers.getContractFactory('Claims');
  const ClaimsData = await ethers.getContractFactory('ClaimsDataMock');
  const ClaimsReward = await ethers.getContractFactory('ClaimsReward');
  const MCR = await ethers.getContractFactory('MCR');
  const TokenData = await ethers.getContractFactory('TokenDataMock');
  const TokenFunctions = await ethers.getContractFactory('TokenFunctions');
  const TokenController = await ethers.getContractFactory('TokenController');
  const Pool1 = await ethers.getContractFactory('Pool1Mock');
  const Pool2 = await ethers.getContractFactory('Pool2');
  const PoolData = await ethers.getContractFactory('PoolDataMock');
  const Quotation = await ethers.getContractFactory('Quotation');
  const QuotationData = await ethers.getContractFactory('QuotationData');
  const Governance = await ethers.getContractFactory('GovernanceMock');
  const ProposalCategory = await ethers.getContractFactory('ProposalCategoryMock');
  const MemberRoles = await ethers.getContractFactory('MemberRoles');
  const PooledStaking = await ethers.getContractFactory('PooledStaking');

  // nexusmutual contracts
  const cl = await Claims.deploy();
  const cd = await ClaimsData.deploy();
  const cr = await ClaimsReward.deploy();

  const p1 = await Pool1.deploy();
  // factory has to be uniswap Factory
  const p2 = await Pool2.deploy(uniswapFactory.address);
  // dsv has to be dai price feed using 
  const pd = await PoolData.deploy(owner, dsv.address, dai.address);

  const mcr = await MCR.deploy();

  const tk = await NXMToken.deploy(owner, INITIAL_SUPPLY);
  const tc = await TokenController.deploy();
  const td = await TokenData.deploy(owner);
  const tf = await TokenFunctions.deploy();

  const qt = await Quotation.deploy();
  const qd = await QuotationData.deploy(QE, owner);

  const gvImpl = await Governance.deploy();
  const pcImpl = await ProposalCategory.deploy();
  const mrImpl = await MemberRoles.deploy();
  const psImpl = await PooledStaking.deploy();

  const addresses = [
    qd.address,
    td.address,
    cd.address,
    pd.address,
    qt.address,
    tf.address,
    tc.address,
    cl.address,
    cr.address,
    p1.address,
    p2.address,
    mcr.address,
    gvImpl.address,
    pcImpl.address,
    mrImpl.address,
    psImpl.address,
  ];

  const masterImpl = await NXMaster.deploy();
  const masterProxy = await OwnedUpgradeabilityProxy.deploy(masterImpl.address);
  const master = await NXMaster.attach(masterProxy.address);

  await master.initiateMaster(tk.address);
  await master.addPooledStaking();
  await master.addNewVersion(addresses);

  const ps = await getProxyFromMaster(master, PooledStaking, 'PS');
  await ps.migrateStakers('1');
  //assert(await ps.initialized(), 'Pooled staking contract should have been initialized');

  // fetch proxy contract addresses
  const gvProxyAddress = await master.getLatestAddress(hex('GV'));
  const pcProxyAddress = await master.getLatestAddress(hex('PC'));

  // transfer master ownership and init governance
  await masterProxy.transferProxyOwnership(gvProxyAddress);

  // init governance
  const gv = await Governance.attach(gvProxyAddress);
  const pc = await ProposalCategory.attach(pcProxyAddress);

  await gv._initiateGovernance();
  await pc.proposalCategoryInitiate();
  await pc.updateCategoryActionHashes();

  // fund pools
  await p1.connect(deployer).sendEther({ value: POOL_ETHER });
  await p2.connect(deployer).sendEther({ value: POOL_ETHER });
  await dai.transfer(p2.address, POOL_DAI);

  // add mcr
  await mcr.addMCRData(
    13000,
    ether('1000'),
    ether('70000'),
    [hex('ETH'), hex('DAI')],
    [100, 15517],
    20190103,
  );

  await p2.saveIADetails(
    [hex('ETH'), hex('DAI')],
    [100, 15517],
    20190103,
    true,
  );

  const instances = { tk, qd, td, cd, pd, qt, tf, cl, cr, p1, p2, mcr };
  const proxies = {
    tc: await getProxyFromMaster(master, TokenController, 'TC'),
    gv: await getProxyFromMaster(master, Governance, 'GV'),
    pc: await getProxyFromMaster(master, ProposalCategory, 'PC'),
    mr: await getProxyFromMaster(master, MemberRoles, 'MR'),
    ps,
  };

  await proxies.mr.connect(deployer).payJoiningFee(owner, { value: ether('0.002') });
  await proxies.mr.kycVerdict(owner, true);
  await tk.transfer(owner, "37500");

  await proxies.mr.addInitialABMembers([owner]);

  const roundsStartTimeSecondsUntilStart = 10;
  const latest = (await time.latest()).toNumber();
  const roundsStartTime = latest + roundsStartTimeSecondsUntilStart;
  const roundDuration = 7 * 24 * 60 * 60;

  await time.increase(roundsStartTimeSecondsUntilStart + 10);

  return {
    master: master,
    nxm: tk,
    claims: cl,
    claimsData: cd,
    claimsReward: cr,
    mcr: mcr,
    tokenData: td,
    tokenFunctions: tf,
    tokenController: proxies.tc,
    pool1: p1,
    pool2: p2,
    poolData: pd,
    quotation: qt,
    quotationData: qd,
    governance: proxies.gv,
    proposalCategory: proxies.pc,
    memberRoles: proxies.mr,
    pooledStaking: proxies.ps
  };
}
