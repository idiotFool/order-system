
import type { OrderStatus } from "@/types/order";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "待审批",
    className: "bg-amber-100 text-amber-800",
  },
  APPROVED: {
    label: "已通过",
    className: "bg-green-100 text-green-800",
  },
  REJECTED: {
    label: "已驳回",
    className: "bg-red-100 text-red-800",
  },
};

export default function OrderStatusBadge({
  status,
}: OrderStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
