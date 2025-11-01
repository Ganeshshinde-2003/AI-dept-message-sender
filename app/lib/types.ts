export interface Borrower {
  id: number;
  name: string;
  email: string;
  phone: string;
  outstandingAmount: number;
}

export interface Message {
  sender: 'user' | 'ai' | 'status';
  text: string;
}
