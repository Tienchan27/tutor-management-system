export interface CreateBankAccountRequest {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

export interface VerifyBankAccountRequest {
  notes?: string | null;
}

export interface BankAccountResponse {
  id: string;
  bankName: string;
  maskedAccountNumber: string;
  accountHolderName: string;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
}
