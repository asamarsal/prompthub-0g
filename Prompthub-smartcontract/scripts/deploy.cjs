const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Balance:",
    hre.ethers.formatEther(
      await hre.ethers.provider.getBalance(deployer.address)
    ),
    "0G"
  );

  const contracts = {};
  const txHashes = {};

  // 1. Treasury
  console.log("\n[1/5] Deploying PromptHubTreasury...");
  const Treasury = await hre.ethers.getContractFactory("PromptHubTreasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  contracts.treasury = await treasury.getAddress();
  txHashes.treasury = treasury.deploymentTransaction()?.hash ?? null;
  console.log("  Address:", contracts.treasury);
  console.log("  Tx Hash:", txHashes.treasury);

  // 2. Marketplace
  console.log("\n[2/5] Deploying PromptHubMarketplace...");
  const Marketplace = await hre.ethers.getContractFactory(
    "PromptHubMarketplace"
  );
  const marketplace = await Marketplace.deploy(contracts.treasury);
  await marketplace.waitForDeployment();
  contracts.marketplace = await marketplace.getAddress();
  txHashes.marketplace = marketplace.deploymentTransaction()?.hash ?? null;
  console.log("  Address:", contracts.marketplace);
  console.log("  Tx Hash:", txHashes.marketplace);

  // 3. EscrowHire
  console.log("\n[3/5] Deploying PromptHubEscrowHire...");
  const Escrow = await hre.ethers.getContractFactory("PromptHubEscrowHire");
  const escrow = await Escrow.deploy(contracts.treasury);
  await escrow.waitForDeployment();
  contracts.escrowHire = await escrow.getAddress();
  txHashes.escrowHire = escrow.deploymentTransaction()?.hash ?? null;
  console.log("  Address:", contracts.escrowHire);
  console.log("  Tx Hash:", txHashes.escrowHire);

  // 4. Contests
  console.log("\n[4/5] Deploying PromptHubContests...");
  const Contests = await hre.ethers.getContractFactory("PromptHubContests");
  const contests = await Contests.deploy(contracts.treasury);
  await contests.waitForDeployment();
  contracts.contests = await contests.getAddress();
  txHashes.contests = contests.deploymentTransaction()?.hash ?? null;
  console.log("  Address:", contracts.contests);
  console.log("  Tx Hash:", txHashes.contests);

  // 5. AgentRegistry
  console.log("\n[5/5] Deploying AgentRegistry...");
  const Agent = await hre.ethers.getContractFactory("AgentRegistry");
  const agent = await Agent.deploy();
  await agent.waitForDeployment();
  contracts.agentRegistry = await agent.getAddress();
  txHashes.agentRegistry = agent.deploymentTransaction()?.hash ?? null;
  console.log("  Address:", contracts.agentRegistry);
  console.log("  Tx Hash:", txHashes.agentRegistry);

  // ── Post-deploy health checks ──
  console.log("\n--- Post-Deploy Health Checks ---");
  try {
    const totalPrompts = await marketplace.totalPrompts();
    console.log("  Marketplace.totalPrompts():", totalPrompts.toString());
  } catch (e) {
    console.error("  FAIL: Marketplace.totalPrompts():", e.message);
  }
  try {
    const treasuryBal = await hre.ethers.provider.getBalance(
      contracts.treasury
    );
    console.log(
      "  Treasury balance:",
      hre.ethers.formatEther(treasuryBal),
      "0G"
    );
  } catch (e) {
    console.error("  FAIL: Treasury balance:", e.message);
  }
  try {
    const isReg = await agent.isRegistered(deployer.address);
    console.log("  AgentRegistry.isRegistered(deployer):", isReg);
  } catch (e) {
    console.error("  FAIL: AgentRegistry.isRegistered():", e.message);
  }
  console.log("--- Health Checks Complete ---\n");

  // ── Save deployment artifacts ──
  const deploymentDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentDir))
    fs.mkdirSync(deploymentDir, { recursive: true });

  const network = hre.network.name;
  const deploymentData = {
    network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts,
    txHashes,
  };
  fs.writeFileSync(
    path.join(deploymentDir, `${network}.json`),
    JSON.stringify(deploymentData, null, 2)
  );

  const envSnippet = [
    "# --- Paste into Prompthub-frontend/.env ---",
    `NEXT_PUBLIC_TREASURY_ADDRESS=${contracts.treasury}`,
    `NEXT_PUBLIC_MARKETPLACE_ADDRESS=${contracts.marketplace}`,
    `NEXT_PUBLIC_ESCROW_ADDRESS=${contracts.escrowHire}`,
    `NEXT_PUBLIC_CONTESTS_ADDRESS=${contracts.contests}`,
    `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=${contracts.agentRegistry}`,
    "",
    "# --- Paste into Prompthub-backend/.env ---",
    `MARKETPLACE_CONTRACT_ADDRESS=${contracts.marketplace}`,
    `ESCROW_CONTRACT_ADDRESS=${contracts.escrowHire}`,
    `CONTESTS_CONTRACT_ADDRESS=${contracts.contests}`,
    `TREASURY_CONTRACT_ADDRESS=${contracts.treasury}`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(deploymentDir, `${network}.env`), envSnippet);

  console.log("Deployment artifacts saved to:", deploymentDir);
  console.log("Contracts:", contracts);
  console.log("Tx Hashes:", txHashes);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
