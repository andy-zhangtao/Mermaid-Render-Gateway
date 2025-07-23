# Mermaid 渲染网关 - 项目需求文档

## 概念澄清与建议

**⚠️ 重要提醒：** 
- 你描述的功能更适合叫 "Mermaid Render Service" 而不是 "MCP 服务端"
- MCP (Model Context Protocol) 是用于 AI 模型与工具通信的协议，与你的图片渲染需求不符
- 建议项目名称改为 `mermaid-render-service` 或 `mermaid-gateway`

## 项目定位

**核心定位：** HTTP API 服务，提供 Mermaid 图表的在线渲染能力

**技术栈建议：**
- Node.js + Express/Fastify
- `@mermaid-js/mermaid` 或 `mermaid-cli` 用于渲染
- 可考虑使用 Puppeteer 进行无头浏览器渲染

## 功能需求梳理

### 1. 核心 API 接口

```
POST /render
Content-Type: application/json

{
  "mermaid": "graph TD; A-->B; B-->C;",
  "format": "base64|url|binary",
  "options": {
    "theme": "default|dark|neutral",
    "width": 800,
    "height": 600,
    "backgroundColor": "#ffffff"
  }
}
```

**响应格式：**
```json
{
  "success": true,
  "format": "base64",
  "data": "data:image/png;base64,iVBOR...",
  "metadata": {
    "width": 800,
    "height": 600,
    "renderTime": 120
  }
}
```

### 2. 三种输出格式详解

#### Base64 格式
- **用途：** 前端直接嵌入 `<img>` 标签
- **优点：** 无需存储，即时返回
- **缺点：** 数据量大，不适合大图

#### URL 格式  
- **用途：** 图片链接分享，缓存优化
- **实现：** 将图片存储到本地/云存储，返回访问 URL
- **注意：** 需要实现图片清理机制，避免存储空间无限增长

#### Binary 格式
- **用途：** 文件下载，二次处理
- **实现：** 直接返回图片二进制流
- **Response Header：** `Content-Type: image/png`

### 3. 错误处理策略

```json
{
  "success": false,
  "error": {
    "code": "SYNTAX_ERROR",
    "message": "Mermaid 语法错误：第3行缺少箭头",
    "details": {
      "line": 3,
      "column": 12,
      "suggestion": "检查节点连接语法"
    }
  }
}
```

**错误类型定义：**
- `SYNTAX_ERROR`: Mermaid 语法错误
- `RENDER_FAILED`: 渲染引擎失败
- `TIMEOUT`: 渲染超时
- `INVALID_FORMAT`: 不支持的输出格式

### 4. 性能优化建议

**缓存机制：**
- 对相同 Mermaid 内容进行结果缓存
- 使用 MD5 hash 作为缓存键
- 建议缓存时间：1小时

**并发控制：**
- 使用队列限制同时渲染数量
- 建议最大并发：10个渲染任务
- 超时时间：30秒

**资源管理：**
- 定期清理临时图片文件
- 监控内存使用，防止内存泄漏

## 技术架构建议

### 核心模块划分

```
src/
├── controllers/     # API 控制器
├── services/       # 渲染服务
├── utils/          # 工具函数
├── middleware/     # 中间件
├── config/         # 配置管理
└── types/          # TypeScript 类型定义
```

### 关键依赖包

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mermaid": "^10.0.0",
    "puppeteer": "^21.0.0",
    "sharp": "^0.32.0",
    "node-cache": "^5.1.0"
  }
}
```

## 部署与运维

### 环境变量配置
```env
PORT=3000
CACHE_TTL=3600
MAX_CONCURRENT_RENDERS=10
STORAGE_PATH=/tmp/mermaid-images
RENDER_TIMEOUT=30000
```

### Docker 部署建议
- 使用包含 Chrome 的基础镜像
- 配置足够的内存（建议 1GB+）
- 挂载临时存储卷

## 安全考虑

**输入验证：**
- 限制 Mermaid 内容长度（建议 10KB 以内）
- 过滤潜在的恶意代码注入
- 限制渲染复杂度，防止 DoS 攻击

**访问控制：**
- API 速率限制：每分钟 60 次请求
- 可选择添加 API Key 认证

## 监控指标

- 渲染成功率
- 平均渲染时间
- 并发用户数
- 错误类型分布
- 缓存命中率

---

## 吐槽时间 🤔

你的需求描述还算清晰，但有几个地方需要清醒一下：

1. **MCP vs HTTP API：** 别被概念搞混了，你要的就是个普通的图片渲染 API 服务
2. **"可扩展性"空话：** 与其说"支持更多图表类型"，不如直接说支持 Mermaid 的所有图表类型
3. **性能优化过早：** 先把基本功能做出来，别一开始就想着"高并发"和"缓存机制"

**建议实施顺序：**
1. 先实现基本的 Base64 格式渲染
2. 再添加 URL 和 Binary 格式
3. 最后考虑性能优化和缓存

现在开始写代码吧，别在需求上纠结太久！