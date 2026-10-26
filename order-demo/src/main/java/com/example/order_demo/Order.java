package com.example.order_demo;

import java.math.BigDecimal;

// record 创建的对象是不可变的
public record Order(
        Long id,
        String productName,
        BigDecimal amount,
        OrderStatus status
) {
}