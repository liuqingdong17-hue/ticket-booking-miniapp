# 演出门票在线预订系统（微信小程序）

## 项目介绍

本项目是一个基于微信小程序的演出门票在线预订系统，用户可以浏览演出信息、选择场次、在线选座并完成购票流程。

系统包含用户端小程序和后台服务，模拟真实演出购票平台的核心功能。

---

## 技术栈

前端：

- 微信小程序（WXML / WXSS / JavaScript）

后端：

- Node.js
- Express

数据库：

- MySQL

其他技术：

- WebSocket（实时座位状态同步）
- Canvas（绘制座位图）

---

## 核心功能

### 1 演出浏览

- 首页推荐演出
- 按时间 / 城市 / 分类筛选

### 2 场次选择

- 查看演出不同场次
- 查看演出时间和场馆

### 3 在线选座

- Canvas绘制座位图
- 实时显示座位状态
- 支持用户选座

### 4 订单系统

- 创建订单
- 查看订单信息
- 生成订单二维码

### 5 实时座位同步

- 使用 WebSocket 实现座位锁定
- 防止多人同时购买同一座位


## 项目截图

### 首页

<img width="374" height="786" alt="image" src="https://github.com/user-attachments/assets/479d0ed1-9c6d-4393-b6c4-7897d1d4524c" />


### 演出详情

<img width="374" height="769" alt="image" src="https://github.com/user-attachments/assets/0f5e6706-d5f7-4242-bbd0-bb659c8093bb" />


### 座位选择

<img width="368" height="765" alt="屏幕截图 2026-01-22 102526" src="https://github.com/user-attachments/assets/37bebac3-79d1-4d3b-ab71-a70da327b8b6" />

### 二维码
<img width="305" height="296" alt="屏幕截图 2026-01-24 172440" src="https://github.com/user-attachments/assets/81a18231-bdc1-4eb3-b729-d76344a1a079" />

### 后台
<img width="1919" height="1031" alt="屏幕截图 2025-12-29 101350" src="https://github.com/user-attachments/assets/54dccdc5-b7b8-4556-8288-eb73042d9178" />

---

## 项目运行

1 安装依赖
-npm install

2 启动服务
-node server.js

3 使用微信开发者工具运行小程序

---

## 作者

肖开广
