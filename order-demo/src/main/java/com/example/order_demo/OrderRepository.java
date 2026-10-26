package com.example.order_demo;

import org.springframework.data.jpa.repository.JpaRepository;

// OrderEntity: 这个 Repository 操作的是哪一种实体
// Long 这个实体的主键类型
// 继承 JpaRepository 后，Spring Data JPA 会自动提供常用的数据库操作
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
}
