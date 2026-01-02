/**
 * TypeScript types for blockchain data structures
 */

export interface Loan {
    loanId: bigint;
    borrower: `0x${string}`;
    lender: `0x${string}`;
    assetTokenId: bigint;
    principal: bigint;
    interestRate: bigint;
    duration: bigint;
    startTime: bigint;
    totalRepayment: bigint;
    amountRepaid: bigint;
    status: number; // 0 = Active, 1 = Repaid, 2 = Defaulted
    stablecoin: `0x${string}`;
}

export interface Asset {
    assetTokenId: bigint;
    assetType: string;
    aiValuation: bigint;
    owner: `0x${string}`;
    isCollateralized: boolean;
    metadataURI: string;
}
