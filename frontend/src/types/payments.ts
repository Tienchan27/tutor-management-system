export interface PaymentQrResponse {
  qrPayload: string;
  qrRef: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  amount: number | null;
  description: string | null;
}

export interface BankCatalogEntry {
  bin: string;
  code: string;
  shortName: string;
  name: string;
  logoUrl: string | null;
  transferSupported: boolean;
}

export interface CenterBankAccount {
  bankBin: string;
  bankCode: string | null;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  updatedAt: string;
}

export interface UpdateCenterBankAccountRequest {
  bankBin: string;
  accountNumber: string;
  accountHolderName: string;
}
