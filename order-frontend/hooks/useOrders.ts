
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveOrder,
  createOrder,
  getOrders,
  rejectOrder,
} from "@/lib/api";
import type { Order } from "@/types/order";

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processingOrderId, setProcessingOrderId] =
    useState<number | null>(null);

  
  useEffect(() => {
    let cancelled = false;

    getOrders()
      .then((data) => {
        if (!cancelled) {
          setOrders(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "获取订单失败"
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/orders/events`
    );

    eventSource.addEventListener("order-changed", () => {
      getOrders()
        .then((data) => {
          if (!cancelled) {
            setOrders(data);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(
              err instanceof Error ? err.message : "刷新订单失败"
            );
          }
        });
    });

    eventSource.onerror = () => {
      console.warn("SSE 连接异常，浏览器会尝试自动重连");
    };

    return () => {
      cancelled = true;
      eventSource.close();
    };
  }, []);


  const createNewOrder = useCallback(
    async (productName: string, amount: number) => {
      setError("");
      setSuccessMessage("");
      setSubmitting(true);

      try {
        const newOrder = await createOrder({
          productName,
          amount,
        });

        setOrders((currentOrders) => [
          ...currentOrders,
          newOrder,
        ]);
        setSuccessMessage("订单创建成功！");
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "创建订单失败"
        );
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const updateOrder = useCallback(
    async (id: number, action: "approve" | "reject") => {
      if (processingOrderId !== null) {
        return;
      }

      setError("");
      setSuccessMessage("");
      setProcessingOrderId(id);

      try {
        const updatedOrder =
          action === "approve"
            ? await approveOrder(id)
            : await rejectOrder(id);

        setOrders((currentOrders) =>
          currentOrders.map((order) =>
            order.id === id ? updatedOrder : order
          )
        );

        setSuccessMessage(
          action === "approve" ? "订单审批成功！" : "订单已驳回！"
        );
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "订单操作失败"
        );
      } finally {
        setProcessingOrderId(null);
      }
    },
    [processingOrderId]
  );

  return {
    orders,
    loading,
    error,
    successMessage,
    submitting,
    processingOrderId,
    createNewOrder,
    updateOrder,
  };
}
