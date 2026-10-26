package com.example.order_demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

// @Component 让 Spring 自动发现并管理这个类
// CommandLineRunner 应用启动完成、准备开始处理请求时，执行 run() 方法
@Component
public class OrderDataInitializer implements CommandLineRunner {

    private final OrderRepository orderRepository;

    public OrderDataInitializer(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    public void run(String... args) {
        if (orderRepository.count() > 0) {
            return;
        }

        orderRepository.save(
            new OrderEntity(
                "MacBook Pro",
                new BigDecimal("12999.00"),
                OrderStatus.PENDING
            )
        );

        orderRepository.save(
            new OrderEntity(
                "iPhone",
                new BigDecimal("6999.00"),
                OrderStatus.PENDING
            )
        );

        orderRepository.save(
            new OrderEntity(
                "机械键盘",
                new BigDecimal("599.00"),
                OrderStatus.PENDING
            )
        );
    }
}
