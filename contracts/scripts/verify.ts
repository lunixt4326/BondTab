import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const configPath = path.resolve(__dirname, "../../web/src/config/deployed.json");
  if (!fs.existsSync(configPath)) {
    console.error("⛔ deployed.json not found. Run deploy.ts first.");
    process.exit(1);
  }

  const deployed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const usdcAddress = process.env.USDC_ADDRESS || "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

  console.log("\n🔍 BondTab — Polygonscan Verification");
  console.log("════════════════════════════════════════════\n");

  const contracts = [
    { name: "ReputationRegistry", address: deployed.reputationRegistry, args: [] },
    { name: "BondTabGroup", address: deployed.groupImplementation, args: [] },
    { name: "ExpenseModule", address: deployed.expenseImplementation, args: [] },
    { name: "DisputeModule", address: deployed.disputeImplementation, args: [] },
    {
      name: "GroupFactory",
      address: deployed.factory,
      args: [
        deployed.groupImplementation,
        deployed.expenseImplementation,
        deployed.disputeImplementation,
        usdcAddress,
        deployed.reputationRegistry,
      ],
    },
  ];

  for (const contract of contracts) {
    console.log(`Verifying ${contract.name} at ${contract.address}...`);
    try {
      await run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.args,
      });
      console.log(`  ✅ ${contract.name} verified\n`);
    } catch (err: any) {
      if (err.message.includes("Already Verified")) {
        console.log(`  ℹ️  ${contract.name} already verified\n`);
      } else {
        console.error(`  ❌ ${contract.name} verification failed: ${err.message}\n`);
      }
    }
  }

  console.log("🎉 Verification complete!\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
