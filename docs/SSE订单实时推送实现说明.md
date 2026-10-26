# 使用 SSE 实现订单状态的服务端主动推送

> 本文基于当前的订单管理示例项目，介绍如何在 Spring Boot 后端使用 SSE（Server-Sent Events）主动通知 Next.js 前端，并让多个浏览器窗口自动同步订单列表。

## 1. 背景与目标

在传统的前后端交互中，前端通常在用户操作后调用 REST API，再根据响应更新当前页面。但如果有多个客户端同时打开订单列表，客户端 A 创建或审批订单后，客户端 B 不会自动知道数据已经变化，除非手动刷新或定期轮询。

本项目使用 **REST API + SSE** 解决这个问题：

- **REST API**：负责查询、创建、审批、驳回订单等业务操作。
- **SSE**：负责在订单发生变化后，由服务端主动向已连接的客户端发送通知。
- **前端收到通知后重新查询订单列表**，获得服务端最新数据。

SSE 是单向通信：数据由服务端推送到客户端。客户端仍通过普通 HTTP API 向服务端提交业务操作。

## 2. 整体流程

```text
客户端 A                    Spring Boot 后端                    客户端 B
   |                              |                                |
   |--- POST 创建订单 ----------->|                                |
   |                              |--- 保存订单到数据库             |
   |                              |--- 发布 order-changed 事件      |
   |                              |                                |
   |                              |==== SSE 广播事件 ==============>|
   |                              |                                |
   |                              |<---------- GET /api/orders -----|
   |                              |---------- 最新订单列表 --------->|
   |                              |                                |
   |<------ REST 响应 ------------|                                |
```

更具体地说：

1. 浏览器页面加载时，调用 `GET /api/orders` 获取初始数据。
2. 前端创建一个 `EventSource`，连接 `GET /api/orders/events`。
3. 后端通过 `SseEmitter` 保存这个客户端的 SSE 连接。
4. 用户创建、审批或驳回订单，前端仍然调用原有 REST API。
5. 后端业务逻辑成功保存订单后，调用 `OrderEventPublisher.publish(...)`。
6. 所有已订阅的客户端收到 `order-changed` 事件。
7. 每个客户端收到事件后重新调用 `GET /api/orders`，刷新本地列表。

## 3. 为什么选择 SSE？

SSE 适合“服务端主动通知，客户端主要接收”的需求：

- 浏览器有原生 `EventSource` API。
- 基于 HTTP 文本事件流，易于理解和调试。
- `EventSource` 默认会在连接中断后尝试自动重连。
- 对只需要接收通知的页面，通常比实现完整的 WebSocket 双向消息机制更简单。

需要注意：

- SSE 本身不等于可靠消息队列。自动重连不保证断线期间的所有业务事件都会补发。
- SSE 主要传输文本事件；当前示例推送的是 JSON 数据。
- 代理、负载均衡、超时设置和跨域策略仍需要正确配置。

## 4. 后端实现（Spring Boot）

当前后端类都位于 `com.example.order_demo` 包中。

### 4.1 `OrderEventPublisher`：管理连接并广播事件

```java
package com.example.order_demo;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class OrderEventPublisher {

    private final List<SseEmitter> emitters =
            new CopyOnWriteArrayList<>();

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
```

关键点：

- `SseEmitter` 表示一个服务端到客户端的 SSE 连接。
- `new SseEmitter(0L)` 表示不设置应用层超时时间；连接仍可能因浏览器关闭、网络中断或代理超时而结束。
- `CopyOnWriteArrayList` 允许在广播遍历时安全地添加或移除连接，适合读多写少的连接列表场景。
- `subscribe()` 在客户端连接时创建并登记 emitter。
- `onCompletion`、`onTimeout`、`onError` 回调负责清理连接，避免断开的连接长期留在集合里。
- `SseEmitter.event().comment("connected")` 发送 SSE 注释作为初始响应。注释不会触发前端业务事件，但可以让连接建立时尽早有响应。
- `publish()` 遍历所有当前连接，发送指定事件名和数据；发送失败的连接会被移除。

当前实现是一个**单实例、内存级广播**方案。它适合本地示例和单实例服务；多实例部署时，不同实例的内存集合互不共享，需要借助 Redis Pub/Sub、消息代理等机制传播事件。

### 4.2 `OrderEventController`：暴露 SSE 订阅端点

```java
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

    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe() {
        return eventPublisher.subscribe();
    }
}
```

端点为：

```text
GET /api/orders/events
Content-Type: text/event-stream
```

`MediaType.TEXT_EVENT_STREAM_VALUE` 会让 Spring 返回 SSE 使用的 `text/event-stream` 内容类型。这个 HTTP 请求会保持打开，服务端可以持续写入事件。

### 4.3 在业务成功后发布事件

事件应该在数据库操作成功之后发布，避免数据库保存失败却通知前端数据已变化。

#### 创建订单

在 `OrderService` 成功保存订单并转换成返回 DTO 后，发布创建事件。示例：

```java
OrderEntity saved = orderRepository.save(entity);
Order order = toOrder(saved);

eventPublisher.publish(
    "order-changed",
    java.util.Map.of(
        "type", "CREATED",
        "orderId", order.id()
    )
);

return order;
```

#### 审批或驳回订单

在订单状态更新并保存成功后发布状态变化事件：

```java
OrderEntity saved = orderRepository.save(entity);
Order order = toOrder(saved);

eventPublisher.publish(
    "order-changed",
    java.util.Map.of(
        "type", "STATUS_CHANGED",
        "orderId", order.id(),
        "status", order.status().name()
    )
);

return order;
```

事件示例：

创建订单：

```text
event:order-changed
data:{"type":"CREATED","orderId":9}
```

审批订单：

```text
event:order-changed
data:{"type":"STATUS_CHANGED","orderId":9,"status":"APPROVED"}
```

驳回订单：

```text
event:order-changed
data:{"type":"STATUS_CHANGED","orderId":10,"status":"REJECTED"}
```

`event` 字段指定事件名，`data` 是 JSON 格式的事件负载。由于前端只需要知道“订单数据已变化”，它收到事件后重新获取完整列表，而不是依赖事件负载来拼装全部数据。

## 5. 前端实现（Next.js）

### 5.1 初次加载数据并订阅事件

在 `hooks/useOrders.ts` 中，使用 `useEffect` 同时完成两件事：

1. 初次调用 `getOrders()` 获取订单列表。
2. 使用 `EventSource` 建立 SSE 连接并监听 `order-changed`。

核心代码如下（保留了组件卸载清理和错误处理的基本逻辑）：

```tsx
useEffect(() => {
  let cancelled = false;

  getOrders()
    .then((data) => {
      if (!cancelled) setOrders(data);
    })
    .catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "获取订单失败");
      }
    })
    .finally(() => {
      if (!cancelled) setLoading(false);
    });

  const eventSource = new EventSource(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/orders/events`
  );

  eventSource.addEventListener("order-changed", () => {
    getOrders()
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "刷新订单失败");
        }
      });
  });

  eventSource.onerror = () => {
    console.warn("SSE 连接异常，浏览器会尝试自动重连");
  };

  return () => {
    cancelled = true;
    eventSource.close();
  };
}, []);
```

注意：`NEXT_PUBLIC_API_BASE_URL` 必须与你的 `lib/api.ts` 使用的后端基础 URL 一致。如果项目中使用的环境变量名称不同，应将其替换为实际名称。

### 5.2 为什么使用 `addEventListener`？

后端发送的事件名是 `order-changed`，这是一个具名 SSE 事件。因此前端使用：

```tsx
eventSource.addEventListener("order-changed", handler);
```

而不是依赖 `eventSource.onmessage`。`onmessage` 主要接收没有指定 `event` 名称的默认消息。

### 5.3 为什么收到事件后重新调用 `getOrders()`？

当前设计将“通知”和“业务数据查询”分开：

- SSE 事件很轻量，只表示订单发生变化。
- REST API 返回当前用户有权查看的完整订单列表。
- 前端始终以服务端返回的数据为准，避免不同客户端各自维护数据造成不一致。

当前页面在本地执行创建、审批或驳回时，也会根据 REST 响应更新自身状态；SSE 主要让其他已连接页面同步变化。即使本地页面也收到广播事件，再次获取列表通常也能得到正确状态，不过可能产生额外的 GET 请求。

## 6. 如何测试

### 6.1 使用 curl 验证连接

在 PowerShell 中执行：

```powershell
curl.exe -N --max-time 60 http://localhost:8080/api/orders/events
```

正常连接后会看到类似：

```text
:connected
```

`--max-time 60` 到时后命令结束是预期行为，因为 SSE 是持续打开的流。

### 6.2 验证业务事件

保持 curl 监听窗口打开，再通过前端创建、审批或驳回订单。监听窗口应看到类似：

```text
event:order-changed
data:{"type":"CREATED","orderId":9}
```

### 6.3 验证跨 Tab / 跨浏览器同步

1. 在两个 Tab 或两个浏览器中打开订单页面。
2. 确保两边都成功加载页面并建立 SSE 连接。
3. 在第一个页面创建、审批或驳回订单。
4. 观察另一个页面是否自动刷新订单列表。

两个浏览器都访问同一个后端实例时，当前广播实现会向所有已订阅连接发送事件。不同电脑测试时，还需要让两台电脑能够访问部署所在机器的地址；`localhost` 只指当前设备本身。

## 7. 当前实现的边界与生产环境注意事项

### 7.1 用户权限

当前 `OrderEventPublisher` 会向所有连接广播所有订单变更事件。若订单列表是共享数据，这符合示例需求；如果不同用户只能查看自己的订单，则需要实现身份认证、授权和按用户/权限过滤事件，并确保 `GET /api/orders` 本身也执行权限校验。SSE 连接不是权限控制机制。

### 7.2 断线和事件可靠性

浏览器的 `EventSource` 会尝试自动重连，但不能因此假设断线期间的所有事件一定会补发。当前实现通过收到事件后重新请求完整订单列表来恢复最新状态；如果要求可靠地重放每一条事件，需要设计事件 ID、持久化事件记录和断点续传机制。

### 7.3 心跳、代理和超时

长连接可能受到反向代理、负载均衡或网络设备的空闲超时影响。生产环境需要根据部署环境配置超时，并视情况发送周期性注释心跳，验证代理是否会缓冲响应。

### 7.4 多实例部署

当前 `emitters` 保存在单个 JVM 的内存中。若部署多个 Spring Boot 实例，发布事件的实例只能直接看到自己的连接集合。可以引入 Redis Pub/Sub 或消息代理，让事件传播到所有实例，再由每个实例通知自己持有的客户端连接。

### 7.5 并发与性能

如果事件非常频繁，客户端每收到一个事件就调用一次 `getOrders()`，可能产生较多查询。可根据业务选择防抖、合并刷新、推送增量数据或使用更适合高频消息的架构。还应监控连接数、发送失败和资源占用。

### 7.6 数据库事务

示例在保存后发布事件。更严谨的生产实现应确保事件只在数据库事务成功提交后发布，避免事务最终回滚但事件已经发出的情况。可以考虑事务提交后事件监听，或在需要可靠投递时采用事务 Outbox 等模式。

## 8. 小结

当前订单项目使用 SSE 的关键设计是：

- 用 REST API 处理创建、审批、驳回和查询。
- 用 `SseEmitter` 管理后端 SSE 连接。
- 业务数据成功更新后，发布具名的 `order-changed` 事件。
- 前端通过 `EventSource` 订阅事件。
- 收到通知后重新调用 `getOrders()`，让其他已打开的页面自动同步。
- 在单后端实例下，通过内存中的连接列表实现广播。

这套方案清晰地分离了业务操作和实时通知，非常适合订单状态、任务进度、系统通知等以服务端推送为主的场景。
