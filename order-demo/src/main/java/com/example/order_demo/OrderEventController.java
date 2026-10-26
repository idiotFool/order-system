
package com.example.order_demo;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/orders")
public class OrderEventController {

    private final OrderEventPublisher eventPublisher;

    public OrderEventController(OrderEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    // MediaType.TEXT_EVENT_STREAM_VALUE：告诉浏览器，返回的是 SSE 事件流，而不是普通 JSON。
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe() {
        // 创建并登记一条客户端连接。
        System.out.println("收到 SSE 订阅请求");
        return eventPublisher.subscribe();
    }
}
