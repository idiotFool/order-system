
import type { Order } from "@/types/order";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("未配置 NEXT_PUBLIC_API_BASE_URL");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.message ?? `请求失败：HTTP ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export function getOrders(): Promise<Order[]> {
  return request<Order[]>("/api/orders");
}

export function createOrder(data: {
  productName: string;
  amount: number;
}): Promise<Order> {
  return request<Order>("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function approveOrder(id: number): Promise<Order> {
  return request<Order>(`/api/orders/${id}/approve`, {
    method: "POST",
  });
}

export function rejectOrder(id: number): Promise<Order> {
  return request<Order>(`/api/orders/${id}/reject`, {
    method: "POST",
  });
}