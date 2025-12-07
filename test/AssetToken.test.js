const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AssetToken", function () {
    let assetToken;
    let owner, borrower, loanManager, otherAccount;

    beforeEach(async function () {
        [owner, borrower, loanManager, otherAccount] = await ethers.getSigners();

        // Deploy AssetToken
        const AssetToken = await ethers.getContractFactory("AssetToken");
        assetToken = await AssetToken.deploy();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await assetToken.owner()).to.equal(owner.address);
        });

        it("Should have correct name and symbol", async function () {
            expect(await assetToken.name()).to.equal("TokenLend Asset");
            expect(await assetToken.symbol()).to.equal("TLA");
        });
    });

    describe("Minting Assets", function () {
        it("Should mint asset with correct metadata", async function () {
            const assetType = "phone";
            const aiValuation = ethers.parseUnits("500", 18); // $500
            const maxLTV = 7000; // 70%
            const tokenURI = "ipfs://QmTest123";

            await expect(
                assetToken.mintAsset(borrower.address, assetType, aiValuation, maxLTV, tokenURI)
            )
                .to.emit(assetToken, "AssetMinted")
                .withArgs(0, borrower.address, assetType, aiValuation);

            // Check ownership
            expect(await assetToken.ownerOf(0)).to.equal(borrower.address);

            // Check asset metadata
            const asset = await assetToken.getAsset(0);
            expect(asset.assetType).to.equal(assetType);
            expect(asset.aiValuation).to.equal(aiValuation);
            expect(asset.maxLTV).to.equal(maxLTV);
            expect(asset.borrower).to.equal(borrower.address);
            expect(asset.isLocked).to.equal(false);
            expect(asset.loanId).to.equal(0);

            // Check token URI
            expect(await assetToken.tokenURI(0)).to.equal(tokenURI);
        });

        it("Should fail if not owner", async function () {
            await expect(
                assetToken.connect(borrower).mintAsset(
                    borrower.address,
                    "phone",
                    ethers.parseUnits("500", 18),
                    7000,
                    "ipfs://test"
                )
            ).to.be.revertedWithCustomError(assetToken, "OwnableUnauthorizedAccount");
        });

        it("Should fail with invalid borrower address", async function () {
            await expect(
                assetToken.mintAsset(
                    ethers.ZeroAddress,
                    "phone",
                    ethers.parseUnits("500", 18),
                    7000,
                    "ipfs://test"
                )
            ).to.be.revertedWith("Invalid borrower address");
        });

        it("Should fail with zero valuation", async function () {
            await expect(
                assetToken.mintAsset(borrower.address, "phone", 0, 7000, "ipfs://test")
            ).to.be.revertedWith("Valuation must be greater than 0");
        });

        it("Should fail with invalid LTV", async function () {
            await expect(
                assetToken.mintAsset(
                    borrower.address,
                    "phone",
                    ethers.parseUnits("500", 18),
                    0,
                    "ipfs://test"
                )
            ).to.be.revertedWith("Invalid LTV ratio");

            await expect(
                assetToken.mintAsset(
                    borrower.address,
                    "phone",
                    ethers.parseUnits("500", 18),
                    10001,
                    "ipfs://test"
                )
            ).to.be.revertedWith("Invalid LTV ratio");
        });
    });

    describe("Locking/Unlocking Assets", function () {
        beforeEach(async function () {
            // Authorize loan manager
            await assetToken.setAuthorizedManager(loanManager.address, true);

            // Mint an asset
            await assetToken.mintAsset(
                borrower.address,
                "phone",
                ethers.parseUnits("500", 18),
                7000,
                "ipfs://test"
            );
        });

        it("Should authorize manager", async function () {
            expect(await assetToken.authorizedManagers(loanManager.address)).to.equal(true);
        });

        it("Should lock asset", async function () {
            const loanId = 1;

            await expect(assetToken.connect(loanManager).lockAsset(0, loanId))
                .to.emit(assetToken, "AssetLocked")
                .withArgs(0, loanId);

            const asset = await assetToken.getAsset(0);
            expect(asset.isLocked).to.equal(true);
            expect(asset.loanId).to.equal(loanId);
        });

        it("Should fail to lock if not authorized", async function () {
            await expect(
                assetToken.connect(otherAccount).lockAsset(0, 1)
            ).to.be.revertedWith("Not authorized");
        });

        it("Should fail to lock already locked asset", async function () {
            await assetToken.connect(loanManager).lockAsset(0, 1);

            await expect(
                assetToken.connect(loanManager).lockAsset(0, 2)
            ).to.be.revertedWith("Asset already locked");
        });

        it("Should unlock asset", async function () {
            await assetToken.connect(loanManager).lockAsset(0, 1);

            await expect(assetToken.connect(loanManager).unlockAsset(0))
                .to.emit(assetToken, "AssetUnlocked")
                .withArgs(0);

            const asset = await assetToken.getAsset(0);
            expect(asset.isLocked).to.equal(false);
            expect(asset.loanId).to.equal(0);
        });

        it("Should fail to unlock if not authorized", async function () {
            await assetToken.connect(loanManager).lockAsset(0, 1);

            await expect(
                assetToken.connect(otherAccount).unlockAsset(0)
            ).to.be.revertedWith("Not authorized");
        });

        it("Should fail to unlock unlocked asset", async function () {
            await expect(
                assetToken.connect(loanManager).unlockAsset(0)
            ).to.be.revertedWith("Asset not locked");
        });
    });

    describe("Max Loan Amount", function () {
        it("Should calculate correct max loan amount", async function () {
            const aiValuation = ethers.parseUnits("1000", 18); // $1000
            const maxLTV = 7000; // 70%

            await assetToken.mintAsset(borrower.address, "car", aiValuation, maxLTV, "ipfs://test");

            const maxLoan = await assetToken.getMaxLoanAmount(0);
            const expected = (aiValuation * BigInt(maxLTV)) / BigInt(10000);

            expect(maxLoan).to.equal(expected); // $700
        });
    });

    describe("Transfer Prevention", function () {
        beforeEach(async function () {
            await assetToken.setAuthorizedManager(loanManager.address, true);
            await assetToken.mintAsset(
                borrower.address,
                "phone",
                ethers.parseUnits("500", 18),
                7000,
                "ipfs://test"
            );
        });

        it("Should allow transfer of unlocked asset", async function () {
            await assetToken.connect(borrower).transferFrom(borrower.address, otherAccount.address, 0);
            expect(await assetToken.ownerOf(0)).to.equal(otherAccount.address);
        });

        it("Should prevent transfer of locked asset", async function () {
            await assetToken.connect(loanManager).lockAsset(0, 1);

            await expect(
                assetToken.connect(borrower).transferFrom(borrower.address, otherAccount.address, 0)
            ).to.be.revertedWith("Cannot transfer locked asset");
        });
    });
});
