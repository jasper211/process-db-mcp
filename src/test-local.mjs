#!/usr/bin/env node
/**
 * test-local.mjs — 本地测试脚本（不依赖 MCP 协议）
 *
 * 直接调用 tools.mjs 的 executeTool 验证查询逻辑
 */

import { tools, executeTool } from "./tools.mjs";

console.log("=== process-db-mcp 本地测试 ===\n");

// 1. 验证工具注册
console.log(`✓ 注册工具数: ${tools.length}`);
tools.forEach((t) => console.log(`  - ${t.name}: ${t.description.slice(0, 40)}...`));

// 2. 测试 list_processes（全部 L3）
console.log("\n--- 测试 list_processes ---");
try {
  const r1 = await executeTool("list_processes", {});
  const data = JSON.parse(r1.content[0].text);
  console.log(`✓ 返回 ${data.row_count} 个 L3 流程`);
} catch (e) {
  console.error(`✗ 失败: ${e.message}`);
}

// 3. 测试 get_value_stream（概览）
console.log("\n--- 测试 get_value_stream ---");
try {
  const r2 = await executeTool("get_value_stream", {});
  const data = JSON.parse(r2.content[0].text);
  console.log(`✓ 返回 ${data.row_count} 条价值流`);
} catch (e) {
  console.error(`✗ 失败: ${e.message}`);
}

// 4. 测试 search
console.log("\n--- 测试 search ---");
try {
  const r3 = await executeTool("search", { keyword: "客户" });
  const data = JSON.parse(r3.content[0].text);
  console.log(`✓ 搜索"客户"返回 ${data.row_count} 条结果`);
} catch (e) {
  console.error(`✗ 失败: ${e.message}`);
}

// 5. 测试 get_kpi
console.log("\n--- 测试 get_kpi ---");
try {
  const r4 = await executeTool("get_kpi", {});
  const data = JSON.parse(r4.content[0].text);
  console.log(`✓ 返回 ${data.row_count} 个 KPI 指标`);
} catch (e) {
  console.error(`✗ 失败: ${e.message}`);
}

console.log("\n=== 测试完成 ===");
