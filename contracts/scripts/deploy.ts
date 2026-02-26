import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // ── Safety Guard ──────────────────────────────────────────────
  const confirmMainnet = process.env.CONFIRM_MAINNET;
  if (confirmMainnet !== "yes") {
    console.error("\n⛔ MAINNET DEPLOYMENT ABORTED");
    console.error("Set CONFIRM_MAINNET=yes in .env to confirm mainnet deployment.");
    console.error("This deploys to Polygon mainnet with REAL funds.\n");
    process.exit(1);
  }

  const usdcAddress = process.env.USDC_ADDRESS || "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("\n🔗 BondTab — Polygon Mainnet Deployment");
  console.log("════════════════════════════════════════════");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} POL`);
  console.log(`USDC:     ${usdcAddress}`);
  console.log(`Network:  Polygon Mainnet (chainId 137)`);
  console.log("════════════════════════════════════════════\n");

  if (balance === 0n) {
    console.error("⛔ Deployer has zero balance. Fund the account with POL for gas.");
    process.exit(1);
  }

  // ── Gas Estimation ────────────────────────────────────────────
  console.log("📊 Estimating gas costs...\n");

  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits("50", "gwei");
  console.log(`Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei\n`);

  // ── Deploy ReputationRegistry ─────────────────────────────────
  console.log("1/5 Deploying ReputationRegistry...");
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputation = await ReputationRegistry.deploy();
  await reputation.waitForDeployment();
  const repAddr = await reputation.getAddress();
  console.log(`    ✅ ReputationRegistry: ${repAddr}`);

  // ── Deploy BondTabGroup Implementation ────────────────────────
  console.log("2/5 Deploying BondTabGroup implementation...");
  const BondTabGroup = await ethers.getContractFactory("BondTabGroup");
  const groupImpl = await BondTabGroup.deploy();
  await groupImpl.waitForDeployment();
  const groupImplAddr = await groupImpl.getAddress();
  console.log(`    ✅ BondTabGroup impl: ${groupImplAddr}`);

  // ── Deploy ExpenseModule Implementation ───────────────────────
  console.log("3/5 Deploying ExpenseModule implementation...");
  const ExpenseModule = await ethers.getContractFactory("ExpenseModule");
  const expenseImpl = await ExpenseModule.deploy();
  await expenseImpl.waitForDeployment();
  const expenseImplAddr = await expenseImpl.getAddress();
  console.log(`    ✅ ExpenseModule impl: ${expenseImplAddr}`);

  // ── Deploy DisputeModule Implementation ───────────────────────
  console.log("4/5 Deploying DisputeModule implementation...");
  const DisputeModule = await ethers.getContractFactory("DisputeModule");
  const disputeImpl = await DisputeModule.deploy();
  await disputeImpl.waitForDeployment();
  const disputeImplAddr = await disputeImpl.getAddress();
  console.log(`    ✅ DisputeModule impl: ${disputeImplAddr}`);

  // ── Deploy GroupFactory ───────────────────────────────────────
  console.log("5/5 Deploying GroupFactory...");
  const GroupFactory = await ethers.getContractFactory("GroupFactory");
  const factory = await GroupFactory.deploy(
    groupImplAddr,
    expenseImplAddr,
    disputeImplAddr,
    usdcAddress,
    repAddr
  );
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log(`    ✅ GroupFactory: ${factoryAddr}`);

  // ── Register Factory in ReputationRegistry ────────────────────
  console.log("\n🔧 Registering factory in ReputationRegistry...");
  const tx = await reputation.grantFactoryRole(factoryAddr);
  await tx.wait();
  console.log("    ✅ Factory role granted");

  // ── Summary ───────────────────────────────────────────────────
  const deployBlock = await ethers.provider.getBlockNumber();
  const timestamp = Math.floor(Date.now() / 1000);

  console.log("\n════════════════════════════════════════════");
  console.log("🎉 BondTab Deployment Complete!");
  console.log("════════════════════════════════════════════");
  console.log(`ReputationRegistry: ${repAddr}`);
  console.log(`BondTabGroup impl:  ${groupImplAddr}`);
  console.log(`ExpenseModule impl: ${expenseImplAddr}`);
  console.log(`DisputeModule impl: ${disputeImplAddr}`);
  console.log(`GroupFactory:       ${factoryAddr}`);
  console.log(`Deploy block:       ${deployBlock}`);
  console.log("════════════════════════════════════════════\n");

  // ── Write deployed.json to web project ────────────────────────
  const deployed = {
    chainId: 137,
    usdc: usdcAddress,
    factory: factoryAddr,
    groupImplementation: groupImplAddr,
    expenseImplementation: expenseImplAddr,
    disputeImplementation: disputeImplAddr,
    reputationRegistry: repAddr,
    deployBlock,
    timestamp,
  };

  const webConfigDir = path.resolve(__dirname, "../../web/src/config");
  if (!fs.existsSync(webConfigDir)) {
    fs.mkdirSync(webConfigDir, { recursive: true });
  }
  const outPath = path.join(webConfigDir, "deployed.json");
  fs.writeFileSync(outPath, JSON.stringify(deployed, null, 2));
  console.log(`📄 Wrote deployed.json → ${outPath}`);
  console.log("\n⚠️  Keep your .env file secure. Never commit private keys.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
