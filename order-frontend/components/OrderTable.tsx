
import type { Order } from "@/types/order";
import OrderStatusBadge from "@/components/OrderStatusBadge";

interface OrderTableProps {
  orders: Order[];
  processingOrderId: number | null;
  onUpdateOrder: (
    id: number,
    action: "approve" | "reject"
  ) => void;
}

export default function OrderTable({
  orders,
  processingOrderId,
  onUpdateOrder,
}: OrderTableProps) {
  if (orders.length === 0) {
    return <p>目前还没有订单。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b bg-gray-100">
            <th className="p-3">订单 ID</th>
            <th className="p-3">商品名称</th>
            <th className="p-3">金额</th>
            <th className="p-3">状态</th>
            <th className="p-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b">
              <td className="p-3">{order.id}</td>
              <td className="p-3">{order.productName}</td>
              <td className="p-3">
                ¥{Number(order.amount).toFixed(2)}
              </td>
              <td className="p-3">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="p-3">
                {order.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={processingOrderId !== null}
                      onClick={() => onUpdateOrder(order.id, "approve")}
                      className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingOrderId === order.id
                        ? "处理中..."
                        : "审批"}
                    </button>

                    <button
                      type="button"
                      disabled={processingOrderId !== null}
                      onClick={() => onUpdateOrder(order.id, "reject")}
                      className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingOrderId === order.id
                        ? "处理中..."
                        : "驳回"}
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-500">已处理</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
