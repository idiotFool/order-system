export type OrderStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Order {
  id: number;
  productName: string;
  amount: number;
  status: OrderStatus;
}