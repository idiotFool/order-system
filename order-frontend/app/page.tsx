
"use client";

import { useOrders } from "@/hooks/useOrders";
import CreateOrderForm from "@/components/CreateOrderForm";
import OrderTable from "@/components/OrderTable";

export default function Home() {
  const {
    orders,
    loading,
    error,
    successMessage,
    submitting,
    processingOrderId,
    createNewOrder,
    updateOrder,
  } = useOrders();

  if (loading) {
    return <main className="p-8">正在加载订单...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-3xl font-bold">订单管理</h1>

      {error && (
        <p
          role="alert"
          className="mb-4 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {successMessage && (
        <p
          role="status"
          className="mb-4 text-sm text-green-700"
        >
          {successMessage}
        </p>
      )}

      <CreateOrderForm
        submitting={submitting}
        onSubmit={createNewOrder}
      />

      <h2 className="mb-4 text-xl font-semibold">订单列表</h2>

      <OrderTable
        orders={orders}
        processingOrderId={processingOrderId}
        onUpdateOrder={updateOrder}
      />
    </main>
  );
}
