#!/usr/bin/env node
/**
 * server.mjs — MCP Server 入口
 *
 * 职责：通过 @modelcontextprotocol/sdk 建立 stdio 传输通道，
 * 注册 ListTools 和 CallTool 请求处理器。
 *
 * 依赖方向：Server → Tools → DB（单向，无循环依赖）
 *
 * 启动方式：
 *   node src/server.mjs
 *
 * 环境变量（可选，覆盖默认配置）：
 *   METABASE_URL        Metabase 服务地址
 *   METABASE_USERNAME   Metabase 用户名
 *   METABASE_PASSWORD   Metabase 密码
 *   METABASE_DB_ID      数据库 ID
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools, executeTool } from "./tools.mjs";

// ── 创建 MCP Server 实例 ──
const server = new Server(
  {
    name: "process-db-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ── 注册 ListTools 处理器 ──
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

// ── 注册 CallTool 处理器 ──
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: params } = request.params;

  try {
    return await executeTool(name, params);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ok: false,
            error: {
              code: error.message.includes("未知工具") ? "UNKNOWN_TOOL" : "EXECUTION_ERROR",
              message: error.message,
            },
          }),
        },
      ],
      isError: true,
    };
  }
});

// ── 启动 ──
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // 服务器通过 stdio 运行，不输出任何非协议内容到 stdout
}

main().catch((error) => {
  console.error("Server 启动失败:", error.message);
  process.exit(1);
});
