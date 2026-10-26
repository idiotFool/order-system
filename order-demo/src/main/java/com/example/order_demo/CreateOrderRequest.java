package com.example.order_demo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

// @NotBlank: 字符串不能为 null、空字符串或全空格
public record CreateOrderRequest(
    @NotBlank(message = "商品名称不能为空")
    String productName,

    @NotNull(message = "订单金额不能为空")
    @Positive(message = "订单金额必须大于 0")
    BigDecimal amount
) {}