package com.example.order_demo;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class OrderEventPublisher {

    // 保存当前连接到后端的客户端。每个浏览器建立一个 SSE 连接，就会有一个对应的 SseEmitter
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    // 新客户端连接时，创建一个 SseEmitter 并加入列表。0L 表示不设置应用层超时时间，并不代表网络连接永远不会断开。

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(0L);

        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(error -> emitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event().comment("connected"));
        } catch (IOException | IllegalStateException exception) {
            emitters.remove(emitter);
            emitter.completeWithError(exception);
        }

        return emitter;
    }

    public void publish(String eventName, Object data) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(
                        SseEmitter.event()
                                .name(eventName)
                                .data(data)
                );
            } catch (IOException | IllegalStateException exception) {
                emitters.remove(emitter);
                emitter.completeWithError(exception);
            }
        }
    }
}

