package com.example.order_demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestBody;

import java.math.BigDecimal;
import java.util.List;

/*
 * 类似组件职责拆分：组件负责展示和交互，业务逻辑单独组织，数据访问再单独管理
 * 1 controller: 处理请求。 接受http请求，调用业务服务，返回响应
 * 2 service: 处理业务逻辑
 * 3 数据层： 保存,查询数据
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public List<Order> getOrders() {
        return orderService.getOrders();
    }

    /*
       使用powershell 触发post请求
       Invoke-RestMethod `
      -Uri "http://localhost:8080/api/orders/1001/approve" `
      -Method Post
     */
    @PostMapping("/{id}/approve")
    public Order approveOrder(@PathVariable Long id) {
        return orderService.approveOrder(id);
    }

    @PostMapping("/{id}/reject")
    public Order rejectOrder(@PathVariable Long id) {
        return orderService.rejectOrder(id);
    }

    @PostMapping
    public Order createOrder(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.createOrder(request);
    }
}
