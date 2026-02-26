import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BondTab Contracts", function () {
  // ── Fixtures ──────────────────────────────────────────────────
  async function deployFixture() {
    const [deployer, alice, bob, charlie, dave] = await ethers.getSigners();

    // Deploy a mock USDC token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    // Deploy ReputationRegistry
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    const reputation = await ReputationRegistry.deploy();
    await reputation.waitForDeployment();

    // Deploy implementations
    const BondTabGroup = await ethers.getContractFactory("BondTabGroup");
    const groupImpl = await BondTabGroup.deploy();
    await groupImpl.waitForDeployment();

    const ExpenseModule = await ethers.getContractFactory("ExpenseModule");
    const expenseImpl = await ExpenseModule.deploy();
    await expenseImpl.waitForDeployment();

    const DisputeModule = await ethers.getContractFactory("DisputeModule");
    const disputeImpl = await DisputeModule.deploy();
    await disputeImpl.waitForDeployment();

    // Deploy Factory
    const GroupFactory = await ethers.getContractFactory("GroupFactory");
    const factory = await GroupFactory.deploy(
      await groupImpl.getAddress(),
      await expenseImpl.getAddress(),
      await disputeImpl.getAddress(),
      await usdc.getAddress(),
      await reputation.getAddress()
    );
    await factory.waitForDeployment();

    // Grant factory role to the factory
    await reputation.grantFactoryRole(await factory.getAddress());

    // Mint USDC to test accounts (1000 USDC each)
    const mintAmount = ethers.parseUnits("1000", 6);
    await usdc.mint(alice.address, mintAmount);
    await usdc.mint(bob.address, mintAmount);
    await usdc.mint(charlie.address, mintAmount);
    await usdc.mint(dave.address, mintAmount);

    return { deployer, alice, bob, charlie, dave, usdc, reputation, factory, groupImpl, expenseImpl, disputeImpl };
  }

  async function createGroupFixture() {
    const base = await loadFixture(deployFixture);
    const { alice, bob, charlie, factory, usdc } = base;

    // Create a group
    const tx = await factory.connect(alice).createGroup(
      "Test Group",
      [alice.address, bob.address, charlie.address],
      86400,        // 1 day challenge window
      ethers.parseUnits("10", 6),   // 10 USDC min bond
      5000,         // 50% quorum
      172800,       // 2 days settlement grace
      1000,         // 10% slash
      86400         // 1 day vote window
    );

    const receipt = await tx.wait();
    const event = receipt?.logs.find((log: any) => {
      try {
        return factory.interface.parseLog(log as any)?.name === "GroupCreated";
      } catch { return false; }
    });

    const parsed = factory.interface.parseLog(event as any);
    const groupAddr = parsed?.args[0];
    const expenseAddr = parsed?.args[1];
    const disputeAddr = parsed?.args[2];

    const group = await ethers.getContractAt("BondTabGroup", groupAddr);
    const expense = await ethers.getContractAt("ExpenseModule", expenseAddr);
    const dispute = await ethers.getContractAt("DisputeModule", disputeAddr);

    // Approve USDC for group (for deposits)
    const approveAmount = ethers.parseUnits("500", 6);
    await usdc.connect(alice).approve(groupAddr, approveAmount);
    await usdc.connect(bob).approve(groupAddr, approveAmount);
    await usdc.connect(charlie).approve(groupAddr, approveAmount);

    // Also approve dispute module for challenger bond
    await usdc.connect(alice).approve(disputeAddr, approveAmount);
    await usdc.connect(bob).approve(disputeAddr, approveAmount);
    await usdc.connect(charlie).approve(disputeAddr, approveAmount);

    return { ...base, group, expense, dispute, groupAddr, expenseAddr, disputeAddr };
  }

  async function bondedGroupFixture() {
    const base = await loadFixture(createGroupFixture);
    const { alice, bob, charlie, group } = base;

    // All members deposit bonds
    const bondAmount = ethers.parseUnits("50", 6); // 50 USDC
    await group.connect(alice).depositBond(bondAmount);
    await group.connect(bob).depositBond(bondAmount);
    await group.connect(charlie).depositBond(bondAmount);

    return { ...base, bondAmount };
  }

  // ── ReputationRegistry Tests ──────────────────────────────────
  describe("ReputationRegistry", function () {
    it("should deploy and set admin role", async function () {
      const { deployer, reputation } = await loadFixture(deployFixture);
      expect(await reputation.hasRole(await reputation.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
    });

    it("should return perfect score for new members", async function () {
      const { alice, reputation } = await loadFixture(deployFixture);
      expect(await reputation.getReliabilityScore(alice.address)).to.equal(10000);
    });
  });

  // ── GroupFactory Tests ────────────────────────────────────────
  describe("GroupFactory", function () {
    it("should create a group", async function () {
      const { factory, alice, bob, charlie } = await loadFixture(deployFixture);

      await expect(factory.connect(alice).createGroup(
        "My Group",
        [alice.address, bob.address, charlie.address],
        86400, ethers.parseUnits("10", 6), 5000, 172800, 1000, 86400
      )).to.emit(factory, "GroupCreated");
    });

    it("should track groups by member", async function () {
      const { factory, alice, bob, charlie } = await loadFixture(deployFixture);

      await factory.connect(alice).createGroup(
        "My Group",
        [alice.address, bob.address, charlie.address],
        86400, ethers.parseUnits("10", 6), 5000, 172800, 1000, 86400
      );

      const groups = await factory.getGroupsByMember(alice.address);
      expect(groups.length).to.equal(1);
    });

    it("should revert with no members", async function () {
      const { factory, alice } = await loadFixture(deployFixture);
      await expect(factory.connect(alice).createGroup(
        "Empty", [], 86400, ethers.parseUnits("10", 6), 5000, 172800, 1000, 86400
      )).to.be.revertedWithCustomError(factory, "NoMembers");
    });
  });

  // ── BondTabGroup: Membership Tests ────────────────────────────
  describe("BondTabGroup: Membership", function () {
    it("should have correct initial members", async function () {
      const { group, alice, bob, charlie } = await loadFixture(createGroupFixture);
      expect(await group.isMember(alice.address)).to.be.true;
      expect(await group.isMember(bob.address)).to.be.true;
      expect(await group.isMember(charlie.address)).to.be.true;
    });

    it("should add a new member (admin only)", async function () {
      const { group, alice, dave } = await loadFixture(createGroupFixture);
      await group.connect(alice).addMember(dave.address);
      expect(await group.isMember(dave.address)).to.be.true;
    });

    it("should revert add from non-admin", async function () {
      const { group, bob, dave } = await loadFixture(createGroupFixture);
      await expect(group.connect(bob).addMember(dave.address))
        .to.be.revertedWithCustomError(group, "NotAdmin");
    });

    it("should remove member with zero balance", async function () {
      const { group, alice, bob } = await loadFixture(createGroupFixture);
      await group.connect(alice).removeMember(bob.address);
      expect(await group.isMember(bob.address)).to.be.false;
    });
  });

  // ── BondTabGroup: Vault (Bond) Tests ──────────────────────────
  describe("BondTabGroup: Vault", function () {
    it("should accept bond deposits", async function () {
      const { group, alice } = await loadFixture(createGroupFixture);
      const amount = ethers.parseUnits("50", 6);
      await expect(group.connect(alice).depositBond(amount))
        .to.emit(group, "BondDeposited")
        .withArgs(alice.address, amount, amount);

      expect(await group.getBondBalance(alice.address)).to.equal(amount);
    });

    it("should report hasBond correctly", async function () {
      const { group, alice } = await loadFixture(createGroupFixture);
      expect(await group.hasBond(alice.address)).to.be.false;

      await group.connect(alice).depositBond(ethers.parseUnits("50", 6));
      expect(await group.hasBond(alice.address)).to.be.true;
    });

    it("should allow bond withdrawal", async function () {
      const { group, alice, usdc } = await loadFixture(createGroupFixture);
      const deposit = ethers.parseUnits("50", 6);
      await group.connect(alice).depositBond(deposit);

      const balBefore = await usdc.balanceOf(alice.address);
      await group.connect(alice).withdrawBond(deposit);
      const balAfter = await usdc.balanceOf(alice.address);

      expect(balAfter - balBefore).to.equal(deposit);
      expect(await group.getBondBalance(alice.address)).to.equal(0);
    });

    it("should revert withdraw with zero amount", async function () {
      const { group, alice } = await loadFixture(createGroupFixture);
      await expect(group.connect(alice).withdrawBond(0))
        .to.be.revertedWithCustomError(group, "AmountZero");
    });

    it("should revert withdraw exceeding balance", async function () {
      const { group, alice } = await loadFixture(createGroupFixture);
      await group.connect(alice).depositBond(ethers.parseUnits("10", 6));
      await expect(group.connect(alice).withdrawBond(ethers.parseUnits("20", 6)))
        .to.be.revertedWithCustomError(group, "InsufficientBond");
    });

    it("should prevent non-members from depositing", async function () {
      const { group, dave, usdc, groupAddr } = await loadFixture(createGroupFixture);
      await usdc.connect(dave).approve(groupAddr, ethers.parseUnits("50", 6));
      await expect(group.connect(dave).depositBond(ethers.parseUnits("50", 6)))
        .to.be.revertedWithCustomError(group, "NotMember");
    });
  });

  // ── ExpenseModule: Propose & Finalize Tests ───────────────────
  describe("ExpenseModule: Propose & Finalize", function () {
    it("should propose an expense", async function () {
      const { expense, alice, bob, charlie } = await loadFixture(bondedGroupFixture);
      const total = ethers.parseUnits("30", 6);
      const split = ethers.parseUnits("10", 6);

      await expect(expense.connect(alice).proposeExpense(
        total,
        [alice.address, bob.address, charlie.address],
        [split, split, split],
        ethers.keccak256("0x1234"),
        ethers.keccak256("0x5678"),
        "QmTestCID123"
      )).to.emit(expense, "ExpenseProposed");

      expect(await expense.expenseCount()).to.equal(1);
    });

    it("should revert if splits don't sum to total", async function () {
      const { expense, alice, bob, charlie } = await loadFixture(bondedGroupFixture);
      await expect(expense.connect(alice).proposeExpense(
        ethers.parseUnits("30", 6),
        [alice.address, bob.address, charlie.address],
        [ethers.parseUnits("10", 6), ethers.parseUnits("10", 6), ethers.parseUnits("5", 6)],
        ethers.keccak256("0x1234"),
        ethers.keccak256("0x5678"),
        "QmTestCID"
      )).to.be.revertedWithCustomError(expense, "SplitSumMismatch");
    });

    it("should finalize after challenge window", async function () {
      const { expense, group, alice, bob, charlie } = await loadFixture(bondedGroupFixture);
      const total = ethers.parseUnits("30", 6);
      const split = ethers.parseUnits("10", 6);

      await expense.connect(alice).proposeExpense(
        total,
        [alice.address, bob.address, charlie.address],
        [split, split, split],
        ethers.keccak256("0x1234"),
        ethers.keccak256("0x5678"),
        "QmTestCID"
      );

      // Advance time past challenge window (1 day)
      await time.increase(86401);

      await expect(expense.finalizeExpense(0))
        .to.emit(expense, "ExpenseFinalized");

      // Check balances updated correctly
      // Alice paid 30, split 10 each → Alice: +20, Bob: -10, Charlie: -10
      expect(await group.getNetBalance(alice.address)).to.equal(ethers.parseUnits("20", 6));
      expect(await group.getNetBalance(bob.address)).to.equal(-ethers.parseUnits("10", 6));
      expect(await group.getNetBalance(charlie.address)).to.equal(-ethers.parseUnits("10", 6));
    });

    it("should revert finalize before challenge window", async function () {
      const { expense, alice, bob, charlie } = await loadFixture(bondedGroupFixture);
      await expense.connect(alice).proposeExpense(
        ethers.parseUnits("30", 6),
        [alice.address, bob.address, charlie.address],
        [ethers.parseUnits("10", 6), ethers.parseUnits("10", 6), ethers.parseUnits("10", 6)],
        ethers.keccak256("0x1234"),
        ethers.keccak256("0x5678"),
        "QmTestCID"
      );

      await expect(expense.finalizeExpense(0))
        .to.be.revertedWithCustomError(expense, "ChallengeWindowActive");
    });

    it("should revert propose without bond", async function () {
      const { expense, dave, group, alice, usdc, groupAddr } = await loadFixture(createGroupFixture);
      // Add dave as member but no bond
      await group.connect(alice).addMember(dave.address);
      await usdc.connect(dave).approve(groupAddr, ethers.parseUnits("100", 6));
      
      await expect(expense.connect(dave).proposeExpense(
        ethers.parseUnits("10", 6),
        [dave.address, alice.address],
        [ethers.parseUnits("5", 6), ethers.parseUnits("5", 6)],
        ethers.keccak256("0x1234"),
        ethers.keccak256("0x5678"),
        "QmTestCID"
      )).to.be.revertedWithCustomError(expense, "NoBond");
    });
  });

  // ── DisputeModule: Challenge & Vote & Resolve Tests ───────────
  describe("DisputeModule: Disputes", function () {
    async function proposedExpenseFixture() {
      const base = await loadFixture(bondedGroupFixture);
      const { expense, alice, bob, charlie } = base;
      const total = ethers.parseUnits("30", 6);
      const split = ethers.parseUnits("10", 6);

      await expense.connect(alice).proposeExpense(
        total,
        [alice.address, bob.address, charlie.address],
        [split, split, split],
        ethers.keccak256("0x1234"),
        ethers.keccak256("0x5678"),
        "QmTestCID"
      );

      return base;
    }

    it("should challenge an expense", async function () {
      const { dispute, bob } = await loadFixture(proposedExpenseFixture);

      await expect(dispute.connect(bob).challengeExpense(
        0,
        1, // inflated
        ethers.keccak256("0xevidence")
      )).to.emit(dispute, "ExpenseChallenged");
    });

    it("should not allow self-challenge", async function () {
      const { dispute, alice } = await loadFixture(proposedExpenseFixture);
      await expect(dispute.connect(alice).challengeExpense(
        0, 1, ethers.keccak256("0xevidence")
      )).to.be.revertedWithCustomError(dispute, "CannotChallengeOwnExpense");
    });

    it("should allow voting and resolve dispute (expense rejected)", async function () {
      const { dispute, expense, group, alice, bob, charlie } = await loadFixture(proposedExpenseFixture);

      // Bob challenges
      await dispute.connect(bob).challengeExpense(0, 1, ethers.keccak256("0xevidence"));

      // Alice and Charlie vote against (reject expense)
      await dispute.connect(bob).voteOnDispute(0, false);
      await dispute.connect(charlie).voteOnDispute(0, false);

      // Advance past vote window
      await time.increase(86401);

      // Resolve
      await expect(dispute.resolveDispute(0))
        .to.emit(dispute, "DisputeResolved");

      // Expense should be rejected
      const status = await expense.getExpenseStatus(0);
      expect(status).to.equal(3); // Rejected
    });

    it("should resolve dispute (expense upheld)", async function () {
      const { dispute, alice, bob, charlie } = await loadFixture(proposedExpenseFixture);

      // Bob challenges
      await dispute.connect(bob).challengeExpense(0, 1, ethers.keccak256("0xevidence"));

      // Alice and Charlie vote for (uphold expense)
      await dispute.connect(alice).voteOnDispute(0, true);
      await dispute.connect(charlie).voteOnDispute(0, true);

      await time.increase(86401);

      await expect(dispute.resolveDispute(0))
        .to.emit(dispute, "DisputeResolved");
    });

    it("should prevent double voting", async function () {
      const { dispute, bob, charlie } = await loadFixture(proposedExpenseFixture);

      await dispute.connect(bob).challengeExpense(0, 1, ethers.keccak256("0xevidence"));
      await dispute.connect(charlie).voteOnDispute(0, true);

      await expect(dispute.connect(charlie).voteOnDispute(0, false))
        .to.be.revertedWithCustomError(dispute, "AlreadyVoted");
    });

    it("should revert resolve before vote window ends", async function () {
      const { dispute, bob } = await loadFixture(proposedExpenseFixture);

      await dispute.connect(bob).challengeExpense(0, 1, ethers.keccak256("0xevidence"));

      await expect(dispute.resolveDispute(0))
        .to.be.revertedWithCustomError(dispute, "VoteWindowActive");
    });
  });

  // ── Settlement Tests ──────────────────────────────────────────
  describe("BondTabGroup: Settlement", function () {
    it("should execute batch settlement", async function () {
      const { expense, group, alice, bob, charlie, usdc, groupAddr } = await loadFixture(bondedGroupFixture);

      // Propose and finalize an expense
      const total = ethers.parseUnits("30", 6);
      const split = ethers.parseUnits("10", 6);
      await expense.connect(alice).proposeExpense(
        total,
        [alice.address, bob.address, charlie.address],
        [split, split, split],
        ethers.keccak256("0x1234"),
        ethers.keccak256("0x5678"),
        "QmTestCID"
      );
      await time.increase(86401);
      await expense.finalizeExpense(0);

      // Bob and Charlie need to approve group for settlement
      await usdc.connect(bob).approve(groupAddr, ethers.parseUnits("100", 6));
      await usdc.connect(charlie).approve(groupAddr, ethers.parseUnits("100", 6));

      // Settle: Bob pays Alice 10, Charlie pays Alice 10
      await expect(group.connect(bob).settleBatch(
        [bob.address, charlie.address],
        [alice.address, alice.address],
        [split, split]
      )).to.emit(group, "SettlementExecuted");

      // All balances should be zeroed out
      expect(await group.getNetBalance(alice.address)).to.equal(0);
      expect(await group.getNetBalance(bob.address)).to.equal(0);
      expect(await group.getNetBalance(charlie.address)).to.equal(0);
    });

    it("should enforce settlement from bond when overdue", async function () {
      const { expense, group, alice, bob, charlie } = await loadFixture(bondedGroupFixture);

      // Create and finalize an expense
      const total = ethers.parseUnits("30", 6);
      const split = ethers.parseUnits("10", 6);
      await expense.connect(alice).proposeExpense(
        total,
        [alice.address, bob.address, charlie.address],
        [split, split, split],
        ethers.keccak256("0x1234"),
        ethers.keccak256("0x5678"),
        "QmTestCID"
      );
      await time.increase(86401);
      await expense.finalizeExpense(0);

      // Advance past settlement grace period (2 days)
      await time.increase(172801);

      // Anyone can enforce settlement from Bob's bond
      const aliceBalBefore = await group.getNetBalance(alice.address);
      await group.settleFromBond(bob.address, alice.address, split);

      // Bob's bond should decrease
      expect(await group.getBondBalance(bob.address)).to.equal(
        ethers.parseUnits("40", 6) // 50 - 10
      );
    });
  });
});
