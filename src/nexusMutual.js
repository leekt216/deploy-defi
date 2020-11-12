var module_1 = require();
"@openzeppelin/test-helpers";
//const { assert } = require('chai');
var hex = require('../utils').hex;
var QE = '0x51042c4d8936a7764d18370a6a0762b860bb8e07';
var INITIAL_SUPPLY = module_1.ether('1500000');
var EXCHANGE_TOKEN = module_1.ether('10000');
var EXCHANGE_ETHER = module_1.ether('10');
var POOL_ETHER = module_1.ether('3500');
var POOL_DAI = module_1.ether('900000');
async;
function getProxyFromMaster(master, contract, code) {
    var address = await, master, getLatestAddress = (hex(code));
    return contract.at(address);
}
;
async;
function deploy(deployer, dai, mkr, uniswapFactory) {
    // external
    var OwnedUpgradeabilityProxy = await, ethers, getContractFactory = ('OwnedUpgradeabilityProxy');
    // dai chainlink price link
    var DSValue = await, ethers, getContractFactory = ('NXMDSValueMock');
    var dsv = await, DSValue, deploy = (owner);
    // nexusmutual
    var NXMToken = await, ethers, getContractFactory = ('NXMToken');
    var NXMaster = await, ethers, getContractFactory = ('NXMasterMock');
    var Claims = await, ethers, getContractFactory = ('Claims');
    var ClaimsData = await, ethers, getContractFactory = ('ClaimsDataMock');
    var ClaimsReward = await, ethers, getContractFactory = ('ClaimsReward');
    var MCR = await, ethers, getContractFactory = ('MCR');
    var TokenData = await, ethers, getContractFactory = ('TokenDataMock');
    var TokenFunctions = await, ethers, getContractFactory = ('TokenFunctions');
    var TokenController = await, ethers, getContractFactory = ('TokenController');
    var Pool1 = await, ethers, getContractFactory = ('Pool1Mock');
    var Pool2 = await, ethers, getContractFactory = ('Pool2');
    var PoolData = await, ethers, getContractFactory = ('PoolDataMock');
    var Quotation = await, ethers, getContractFactory = ('Quotation');
    var QuotationData = await, ethers, getContractFactory = ('QuotationData');
    var Governance = await, ethers, getContractFactory = ('GovernanceMock');
    var ProposalCategory = await, ethers, getContractFactory = ('ProposalCategoryMock');
    var MemberRoles = await, ethers, getContractFactory = ('MemberRoles');
    var PooledStaking = await, ethers, getContractFactory = ('PooledStaking');
    //to determine the owner
    var owner = await, deployer, getAddress = ();
    // nexusmutual contracts
    var cl = await, Claims, deploy = ();
    var cd = await, ClaimsData, deploy = ();
    var cr = await, ClaimsReward, deploy = ();
    var p1 = await, Pool1, deploy = ();
    // factory has to be uniswap Factory
    var p2 = await, Pool2, deploy = (uniswapFactory.address);
    // dsv has to be dai price feed using 
    var pd = await, PoolData, deploy = (owner, dsv.address, dai.address);
    var mcr = await, MCR, deploy = ();
    var tk = await, NXMToken, deploy = (owner, INITIAL_SUPPLY);
    var tc = await, TokenController, deploy = ();
    var td = await, TokenData, deploy = (owner);
    var tf = await, TokenFunctions, deploy = ();
    var qt = await, Quotation, deploy = ();
    var qd = await, QuotationData, deploy = (QE, owner);
    var gvImpl = await, Governance, deploy = ();
    var pcImpl = await, ProposalCategory, deploy = ();
    var mrImpl = await, MemberRoles, deploy = ();
    var psImpl = await, PooledStaking, deploy = ();
    var addresses = [
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
    var masterImpl = await, NXMaster, deploy = ();
    var masterProxy = await, OwnedUpgradeabilityProxy, deploy = (masterImpl.address);
    var master = await, NXMaster, at = (masterProxy.address);
    await;
    master.initiateMaster(tk.address);
    await;
    master.addPooledStaking();
    await;
    master.addNewVersion(addresses);
    var ps = await, getProxyFromMaster = (master, PooledStaking, 'PS');
    await;
    ps.migrateStakers('1');
    assert(await, ps.initialized(), 'Pooled staking contract should have been initialized');
    // fetch proxy contract addresses
    var gvProxyAddress = await, master, getLatestAddress = (hex('GV'));
    var pcProxyAddress = await, master, getLatestAddress = (hex('PC'));
    // transfer master ownership and init governance
    await;
    masterProxy.transferProxyOwnership(gvProxyAddress);
    // init governance
    var gv = await, Governance, at = (gvProxyAddress);
    var pc = await, ProposalCategory, at = (pcProxyAddress);
    await;
    gv._initiateGovernance();
    await;
    pc.proposalCategoryInitiate();
    await;
    pc.updateCategoryActionHashes();
    // fund pools
    await;
    p1.connect(deployer).sendEther({ value: POOL_ETHER });
    await;
    p2.connect(deployer).sendEther({ value: POOL_ETHER });
    await;
    dai.transfer(p2.address, POOL_DAI);
    // add mcr
    await;
    mcr.addMCRData(13000, module_1.ether('1000'), module_1.ether('70000'), [hex('ETH'), hex('DAI')], [100, 15517], 20190103);
    await;
    p2.saveIADetails([hex('ETH'), hex('DAI')], [100, 15517], 20190103, true);
    var instances = { tk: tk, qd: qd, td: td, cd: cd, pd: pd, qt: qt, tf: tf, cl: cl, cr: cr, p1: p1, p2: p2, mcr: mcr };
    var proxies = {
        tc: await, getProxyFromMaster: function (master, TokenController) { }, 'TC': ,
        gv: await, getProxyFromMaster: function (master, Governance) { }, 'GV': ,
        pc: await, getProxyFromMaster: function (master, ProposalCategory) { }, 'PC': ,
        mr: await, getProxyFromMaster: function (master, MemberRoles) { }, 'MR': ,
        ps: ps
    };
    await;
    proxies.mr.connect(deployer).payJoiningFee(owner, { value: module_1.ether('0.002') });
    await;
    proxies.mr.kycVerdict(owner, true);
    await;
    tk.transfer(owner, "37500");
    await;
    proxies.mr.addInitialABMembers([owner]);
    var roundsStartTimeSecondsUntilStart = 10;
    var latest = (await), time, latest = (), toNumber = ();
    var roundsStartTime = latest + roundsStartTimeSecondsUntilStart;
    var roundDuration = 7 * 24 * 60 * 60;
    await;
    time.increase(roundsStartTimeSecondsUntilStart + 10);
    return {
        master: master,
        nxm: nxm,
        claims: cl,
        claimsData: cd,
        claimsReward: cr,
        mcr: mcr,
        tokenData: td,
        tokenFunctions: tf,
        tokenController: tc,
        pool1: p1,
        pool2: p2,
        poolData: pd,
        quotation: qt,
        quotationData: qd,
        governance: gv,
        proposalCategory: pc,
        memberRoles: mr,
        pooledStaking: ps
    };
}
module.exports = setup;
