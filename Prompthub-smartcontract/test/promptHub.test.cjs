const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PromptHub 0G contracts", function () {
  async function deployFixture() {
    const [owner, treasury, creator, buyer, client, artist, brand] = await ethers.getSigners();

    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    const registry = await AgentRegistry.deploy();
    await registry.waitForDeployment();

    const PromptHubMarketplace = await ethers.getContractFactory("PromptHubMarketplace");
    const marketplace = await PromptHubMarketplace.deploy(
      await treasury.getAddress(),
      await registry.getAddress()
    );
    await marketplace.waitForDeployment();

    const PromptHubEscrowHire = await ethers.getContractFactory("PromptHubEscrowHire");
    const escrow = await PromptHubEscrowHire.deploy(
      await treasury.getAddress(),
      await registry.getAddress()
    );
    await escrow.waitForDeployment();

    const PromptHubContests = await ethers.getContractFactory("PromptHubContests");
    const contests = await PromptHubContests.deploy(
      await treasury.getAddress(),
      await registry.getAddress()
    );
    await contests.waitForDeployment();

    await registry.setAuthorizedUpdater(await marketplace.getAddress(), true);
    await registry.setAuthorizedUpdater(await escrow.getAddress(), true);
    await registry.setAuthorizedUpdater(await contests.getAddress(), true);

    return { owner, treasury, creator, buyer, client, artist, brand, registry, marketplace, escrow, contests };
  }

  it("registers and verifies Agent ID profiles", async function () {
    const { owner, artist, registry } = await deployFixture();

    await expect(registry.connect(artist).registerAgent("ipfs://artist-profile"))
      .to.emit(registry, "AgentRegistered")
      .withArgs(await artist.getAddress(), "ipfs://artist-profile");

    await expect(registry.connect(owner).verifyAgent(await artist.getAddress()))
      .to.emit(registry, "AgentVerified")
      .withArgs(await artist.getAddress());

    expect(await registry.isRegistered(await artist.getAddress())).to.equal(true);
    expect(await registry.isVerified(await artist.getAddress())).to.equal(true);
    expect(await registry.getMetadataUri(await artist.getAddress())).to.equal("ipfs://artist-profile");
  });

  it("lists, buys, gates access, and versions marketplace prompts", async function () {
    const { creator, buyer, registry, marketplace } = await deployFixture();
    const price = ethers.parseEther("0.005");

    await registry.connect(creator).registerAgent("ipfs://creator-profile");
    await expect(
      marketplace.connect(creator).listPrompt("ipfs://metadata", price, 50, "0xstoragehash")
    ).to.emit(marketplace, "PromptListed");

    expect(await marketplace.canAccess(1, await creator.getAddress())).to.equal(true);
    expect(await marketplace.canAccess(1, await buyer.getAddress())).to.equal(false);

    await expect(marketplace.connect(buyer).buyPrompt(1, { value: price }))
      .to.emit(marketplace, "PromptPurchased");

    expect(await marketplace.ownerOf(1)).to.equal(await buyer.getAddress());
    expect(await marketplace.canAccess(1, await buyer.getAddress())).to.equal(true);
    expect(await marketplace.connect(buyer).getStorageHash(1)).to.equal("0xstoragehash");

    await expect(
      marketplace.connect(creator).createPromptVersion(1, "ipfs://v2", "0xv2")
    ).to.emit(marketplace, "PromptVersioned");

    await expect(
      marketplace.connect(buyer).createPromptVersion(1, "ipfs://buyer-v2", "0xbuyer")
    ).to.be.revertedWith("Not creator");
  });

  it("creates and completes escrow hire jobs with payout event", async function () {
    const { client, artist, escrow } = await deployFixture();
    const deposit = ethers.parseEther("0.01");

    await expect(escrow.connect(client).createJob(await artist.getAddress(), { value: deposit }))
      .to.emit(escrow, "JobCreated")
      .withArgs(1, await client.getAddress(), await artist.getAddress(), deposit);

    await expect(escrow.connect(client).completeJob(1))
      .to.emit(escrow, "JobCompleted")
      .withArgs(1, await artist.getAddress(), ethers.parseEther("0.00975"));

    const job = await escrow.getJob(1);
    expect(job.status).to.equal(1n);
  });

  it("funds contests, accepts entries, and declares winners", async function () {
    const { artist, brand, contests } = await deployFixture();
    const amounts = [ethers.parseEther("0.007"), ethers.parseEther("0.003")];
    const currentBlock = await ethers.provider.getBlockNumber();

    await expect(
      contests.connect(brand).fundContest(2, amounts, currentBlock + 100, {
        value: ethers.parseEther("0.01"),
      })
    ).to.emit(contests, "ContestFunded");

    await expect(contests.connect(artist).submitEntry(1, "0g://entry-root"))
      .to.emit(contests, "EntrySubmitted")
      .withArgs(1, await artist.getAddress(), "0g://entry-root");

    await expect(contests.connect(brand).declareWinner(1, 1, await artist.getAddress()))
      .to.emit(contests, "WinnerDeclared")
      .withArgs(1, 1, await artist.getAddress(), ethers.parseEther("0.006825"));

    const tier = await contests.getPrizeTier(1, 1);
    expect(tier.hasWinner).to.equal(true);
    expect(tier.winner).to.equal(await artist.getAddress());
  });
});
