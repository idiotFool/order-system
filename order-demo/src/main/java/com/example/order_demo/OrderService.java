package com.example.order_demo;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final OrderEventPublisher eventPublisher;

    public OrderService(OrderRepository orderRepository, OrderEventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
    }

    public List<Order> getOrders() {
        return orderRepository.findAll()
            .stream()
            .map(this::toOrder)
            .toList();
    }

    private Order toOrder(OrderEntity entity) {
        return new Order(
            entity.getId(),
            entity.getProductName(),
            entity.getAmount(),
            entity.getStatus()
        );
    }

    public Order approveOrder(Long id) {
        return updateOrderStatus(id, OrderStatus.APPROVED);
    }

    public Order rejectOrder(Long id) {
        return updateOrderStatus(id, OrderStatus.REJECTED);
    }

    private Order updateOrderStatus(Long id, OrderStatus targetStatus) {
        OrderEntity entity = orderRepository.findById(id)
            .orElseThrow(() ->
                    new IllegalArgumentException("订单不存在，ID：" + id));

        if (entity.getStatus() != OrderStatus.PENDING) {
            throw new IllegalStateException("当前订单状态不允许操作");
        }

        entity.setStatus(targetStatus);

        OrderEntity savedEntity = orderRepository.save(entity);
        Order order = toOrder(savedEntity);

        eventPublisher.publish(
            "order-changed",
            java.util.Map.of(
                "type", "STATUS_CHANGED",
                "orderId", order.id(),
                "status", order.status().name()
            )
        );

        return order;
    }

    public Order createOrder(CreateOrderRequest request) {
        OrderEntity entity = new OrderEntity(
            request.productName(),
            request.amount(),
            OrderStatus.PENDING
        );

        OrderEntity savedEntity = orderRepository.save(entity);
        Order order = toOrder(savedEntity);

        eventPublisher.publish(
            "order-changed",
            java.util.Map.of(
                "type", "CREATED",
                "orderId", order.id()
            )
        );
        return order;
    }
}

