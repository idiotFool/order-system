
"use client";

import { useState } from "react";

interface CreateOrderFormProps {
  submitting: boolean;
  onSubmit: (
    productName: string,
    amount: number
  ) => Promise<void>;
}

export default function CreateOrderForm({
  submitting,
  onSubmit,
}: CreateOrderFormProps) {
  const [productName, setProductName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");

    const trimmedName = productName.trim();
    const parsedAmount = Number(amount);

    if (!trimmedName) {
      setError("请输入商品名称");
      return;
    }

    if (
      !amount.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setError("请输入大于 0 的有效金额");
      return;
    }

    try {
      await onSubmit(trimmedName, parsedAmount);
      setProductName("");
      setAmount("");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "创建订单失败"
      );
    }
  }

  return (
    <section className="mb-8 rounded-lg border p-5">
      <h2 className="mb-4 text-xl font-semibold">创建订单</h2>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="productName"
            className="mb-1 block text-sm font-medium"
          >
            商品名称
          </label>
          <input
            id="productName"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="例如：无线鼠标"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="flex-1">
          <label
            htmlFor="amount"
            className="mb-1 block text-sm font-medium"
          >
            订单金额
          </label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="例如：199.00"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "提交中..." : "创建订单"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
