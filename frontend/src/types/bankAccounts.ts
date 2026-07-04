export interface CreateBankAccountRequest {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  bankBin?: string;
  bankCode?: string;
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
