export interface BankAccount {
  bank: string;
  account: string;
  holder: string;
  idNumber: string;
  note?: string;
}

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    bank: "Banco Familiar",
    account: "35-1464258",
    holder: "José Miguel Ramírez Bolla",
    idNumber: "4.906.387",
    note: "Desde otro banco ingresalo sin el guión.",
  },
  {
    bank: "Eko",
    account: "81-478576",
    holder: "Félix Miguel Ramírez Vázquez",
    idNumber: "1.237.845",
    note: "Desde otro banco ingresalo sin el guión.",
  },
  {
    bank: "ueno bank",
    account: "619249411",
    holder: "Félix Miguel Ramírez Vázquez",
    idNumber: "1.237.845",
  },
  {
    bank: "BNF",
    account: "008-00-082900/8",
    holder: "José Miguel Ramírez Bolla",
    idNumber: "4.906.387",
    note: "Desde otro banco ingresalo sin los guiones ni la barra.",
  },
];

export const PAYMENT_ALIAS = "0985231090";
