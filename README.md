# process-db-mcp

> MCP Server for enterprise process architecture data — 覆盖 L1→L2→L3→L4→L5 五级流程、5 条价值流、岗位族、Agent 自动化能力评估、KPI 指标体系。

## 📋 文档定位说明

| 字段 | 内容 |
|------|------|
| **文档定位** | MCP Server 的「门面文件」和「安装入口」 |
| **核心作用** | 让任何支持 MCP 的 AI 工具（Claude/Cursor/Kimi）通过自然语言查询企业流程架构数据 |
| **使用场景** | ① Claude Desktop 配置 MCP 后问"L1-01 下有哪些 L3 流程？" ② Cursor 中直接查询 Agent 评分 ③ 作为独立 npm 包安装 |
| **维护责任** | Jasper 主责，AI 协同终端辅助迭代 |
| **迭代规则** | ① 新增工具时更新 tools.mjs + 版本号 ② 数据库 Schema 变更时同步更新 SQL ③ 每次发布前运行 test-local.mjs 验证 |
| **关联文件** | [SKILL.md](https://github.com/jasper211/process-db-mcp/blob/main/SKILL.md) · [src/tools.mjs](src/tools.mjs) · [src/db.mjs](src/db.mjs) |

---

## 安装

### 作为 MCP Server 使用（推荐）

在 Claude Desktop / Cursor / VS Code 的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "process-db": {
      "command": "npx",
      "args": ["process-db-mcp@latest"],
      "env": {
        "METABASE_URL": "http://your-metabase:3005",
        "METABASE_USERNAME": "your-user",
        "METABASE_PASSWORD": "your-pass",
        "METABASE_DB_ID": "2"
      }
    }
  }
}
```

### 本地开发

```bash
git clone https://github.com/jasper211/process-db-mcp.git
cd process-db-mcp
npm install
node src/test-local.mjs
```

---

## 工具列表

| 工具 | 说明 | 示例 |
|------|------|------|
| `list_processes` | 按 L1 或价值流列出 L3 流程 | `{"l1_code":"L1-01"}` |
| `get_process_detail` | 查 L3 下全部 L4 或单个 L4 详情 | `{"l3_code":"L3-CAS"}` |
| `get_value_stream` | 查价值流阶段和活动 | `{"vs_code":"VS-4"}` |
| `get_org_positions` | 查岗位族信息 | `{"position_family":"FA"}` |
| `get_agent_info` | 查 Agent 能力档案 | `{"agent_type":"RPA"}` |
| `get_kpi` | 查 KPI 指标 | `{"vs_code":"VS-4"}` |
| `search` | 跨表模糊搜索 | `{"keyword":"客户"}` |
| `run_sql` | 自定义 SQL（高级） | `{"sql":"SELECT ..."}` |

---

## 架构

```
server.mjs (MCP 协议入口)
    ↓
tools.mjs (8 个工具定义 + SQL 构建)
    ↓
db.mjs (Metabase API 连接 + 会话管理)
    ↓
PostgreSQL (process_analytics schema)
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `METABASE_URL` | Metabase 服务地址 | `http://43.98.163.46:3005` |
| `METABASE_USERNAME` | Metabase 用户名 | `mark@mga.hk` |
| `METABASE_PASSWORD` | Metabase 密码 | *(必须覆盖)* |
| `METABASE_DB_ID` | 数据库 ID | `2` |

---

## License

MIT
