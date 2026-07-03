/**
 * tools.mjs — 8 个业务查询工具定义
 *
 * 职责：声明式管理工具元数据（name, description, inputSchema）
 * 与动态 SQL 构建函数（build）。
 *
 * 依赖方向：server.mjs → tools.mjs → db.mjs
 *
 * 每个工具结构：
 *   { name, description, inputSchema (JSON Schema), build(params) => SQL }
 */

import { runQuery } from "./db.mjs";

const S = "process_analytics"; // schema 前缀

/**
 * 8 个工具定义
 */
export const tools = [
  // ── 1. list_processes ──
  {
    name: "list_processes",
    description: "按 L1 价值链或价值流筛选 L3 流程清单。不传参数返回全部当前 L3 流程。",
    inputSchema: {
      type: "object",
      properties: {
        l1_code: { type: "string", description: "L1 编码筛选，如 L1-01、L1-02" },
        vs_code: { type: "string", description: "价值流编码筛选，如 VS-1、VS-4" },
      },
    },
    build(params) {
      const conditions = ["is_current = true"];
      if (params.l1_code) conditions.push(`l1_code = '${params.l1_code}'`);
      if (params.vs_code) {
        return `SELECT DISTINCT p.l1_code, p.l1_name, p.l3_code, p.l3_name, p.l3_domain, p.l3_status
          FROM ${S}.dim_process p
          JOIN ${S}.dim_vs v ON v.l3_primary = p.l3_code
          WHERE v.vs_code = '${params.vs_code}' AND p.is_current = true
          ORDER BY p.l1_code, p.l3_code`;
      }
      return `SELECT DISTINCT l1_code, l1_name, l3_code, l3_name, l3_domain, l3_status
        FROM ${S}.dim_process
        WHERE ${conditions.join(" AND ")}
        ORDER BY l1_code, l3_code`;
    },
  },

  // ── 2. get_process_detail ──
  {
    name: "get_process_detail",
    description: "查某个 L3 的全部 L4 活动详情，或查某个 L4 的完整信息（含 Agent 评分、SLA、交付物）。必须提供 l3_code 或 l4_code。",
    inputSchema: {
      type: "object",
      properties: {
        l3_code: { type: "string", description: "L3 编码，如 L3-CAS，返回该 L3 下所有 L4" },
        l4_code: { type: "string", description: "L4 编码，如 L4-CAS-01，返回该 L4 完整记录" },
      },
    },
    build(params) {
      if (!params.l3_code && !params.l4_code) {
        throw new Error("必须提供 l3_code 或 l4_code");
      }
      if (params.l4_code) {
        return `SELECT * FROM ${S}.dim_process WHERE l4_code = '${params.l4_code}' AND is_current = true`;
      }
      return `SELECT l4_code, l4_name, l4_deliverable, l4_deliverable_type, l4_accountable_role, l4_accountable_family,
          agentifiability, agent_score_total, agent_d1_input_struct, agent_d2_rule_clear, agent_d3_output_verify,
          agent_d4_api_reach, agent_d5_fallback, agent_d6_compliance, sla_hours,
          l3_code, l3_name, l3_trigger, l3_exit_condition, l1_code, l1_name
        FROM ${S}.dim_process
        WHERE l3_code = '${params.l3_code}' AND is_current = true
        ORDER BY l4_code`;
    },
  },

  // ── 3. get_value_stream ──
  {
    name: "get_value_stream",
    description: "查价值流信息。不传参返回 5 条价值流概览；传 vs_code 返回该价值流的所有阶段详情。",
    inputSchema: {
      type: "object",
      properties: {
        vs_code: { type: "string", description: "价值流编码：VS-1 / VS-2 / VS-3 / VS-4 / VS-5" },
      },
    },
    build(params) {
      if (params.vs_code) {
        return `SELECT vs_code, vs_name, vs_stakeholder, s2b2a_layer, vs_trigger,
            stage_code, stage_name, stage_sequence, stage_exit_condition, l3_primary,
            stage_deliverable, stage_kpi, coverage_status
          FROM ${S}.dim_vs
          WHERE vs_code = '${params.vs_code}'
          ORDER BY stage_sequence`;
      }
      return `SELECT DISTINCT vs_code, vs_name, vs_stakeholder, s2b2a_layer,
          COUNT(DISTINCT stage_code) as stage_count
        FROM ${S}.dim_vs
        GROUP BY vs_code, vs_name, vs_stakeholder, s2b2a_layer
        ORDER BY vs_code`;
    },
  },

  // ── 4. get_org_positions ──
  {
    name: "get_org_positions",
    description: "查岗位族信息。不传参返回全部岗位族；传 position_family 返回特定岗位族详情。",
    inputSchema: {
      type: "object",
      properties: {
        position_family: { type: "string", description: "岗位族编码" },
      },
    },
    build(params) {
      if (params.position_family) {
        return `SELECT * FROM ${S}.dim_org WHERE position_family = '${params.position_family}'`;
      }
      return `SELECT * FROM ${S}.dim_org ORDER BY org_key`;
    },
  },

  // ── 5. get_agent_info ──
  {
    name: "get_agent_info",
    description: "查 Agent 能力档案。可按 agent_code 精确查、按 l3_code 查关联 Agent、按 agent_type 筛选。不传参返回前 50 条概览。",
    inputSchema: {
      type: "object",
      properties: {
        agent_code: { type: "string", description: "Agent 编码，精确查找" },
        l3_code: { type: "string", description: "查某 L3 关联的 Agent" },
        agent_type: { type: "string", description: "按 Agent 类型筛选" },
      },
    },
    build(params) {
      if (params.agent_code) {
        return `SELECT * FROM ${S}.dim_agent WHERE agent_code = '${params.agent_code}'`;
      }
      if (params.l3_code) {
        return `SELECT * FROM ${S}.dim_agent WHERE l3_primary = '${params.l3_code}'`;
      }
      if (params.agent_type) {
        return `SELECT agent_code, agent_name, agent_type, agent_status, l3_primary, m4_priority, tech_stack
          FROM ${S}.dim_agent WHERE agent_type = '${params.agent_type}' ORDER BY agent_code`;
      }
      return `SELECT agent_code, agent_name, agent_type, agent_status, l3_primary, l4_count_covered, m4_priority
        FROM ${S}.dim_agent ORDER BY agent_code LIMIT 50`;
    },
  },

  // ── 6. get_kpi ──
  {
    name: "get_kpi",
    description: "查 KPI 指标。可按 kpi_code 精确查、按 vs_code 或 position_family 筛选。不传参返回全部 KPI 概览。",
    inputSchema: {
      type: "object",
      properties: {
        kpi_code: { type: "string", description: "KPI 编码，精确查找" },
        vs_code: { type: "string", description: "按价值流筛选" },
        position_family: { type: "string", description: "按岗位族筛选" },
      },
    },
    build(params) {
      if (params.kpi_code) {
        return `SELECT * FROM ${S}.dim_kpi WHERE kpi_code = '${params.kpi_code}'`;
      }
      if (params.vs_code) {
        return `SELECT * FROM ${S}.dim_kpi WHERE vs_code = '${params.vs_code}' ORDER BY kpi_code`;
      }
      if (params.position_family) {
        return `SELECT * FROM ${S}.dim_kpi WHERE position_family = '${params.position_family}' ORDER BY kpi_code`;
      }
      return `SELECT kpi_code, kpi_name, kpi_type, kpi_level, kpi_unit, vs_code, position_family
        FROM ${S}.dim_kpi ORDER BY kpi_code`;
    },
  },

  // ── 7. search ──
  {
    name: "search",
    description: "跨流程/价值流/Agent/KPI 四张表模糊搜索，返回匹配来源和上下文。",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "搜索关键词（中文或编码）" },
      },
      required: ["keyword"],
    },
    build(params) {
      if (!params.keyword) throw new Error("必须提供 keyword 搜索关键词");
      const kw = params.keyword.replace(/'/g, "''");
      return `SELECT 'process' as source, l3_code as code, l3_name as name, l1_name as context
        FROM ${S}.dim_process
        WHERE is_current = true AND (l3_name ILIKE '%${kw}%' OR l4_name ILIKE '%${kw}%' OR l3_domain ILIKE '%${kw}%')
        UNION ALL
        SELECT 'value_stream', vs_code, vs_name, stage_name
        FROM ${S}.dim_vs
        WHERE vs_name ILIKE '%${kw}%' OR stage_name ILIKE '%${kw}%'
        UNION ALL
        SELECT 'agent', agent_code, agent_name, agent_type
        FROM ${S}.dim_agent
        WHERE agent_name ILIKE '%${kw}%'
        UNION ALL
        SELECT 'kpi', kpi_code, kpi_name, kpi_type
        FROM ${S}.dim_kpi
        WHERE kpi_name ILIKE '%${kw}%'
        LIMIT 50`;
    },
  },

  // ── 8. run_sql ──
  {
    name: "run_sql",
    description: "直接执行自定义 SQL 查询。表名需加 process_analytics. 前缀。仅限高级用户使用。",
    inputSchema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "完整 SQL 语句" },
      },
      required: ["sql"],
    },
    build(params) {
      if (!params.sql) throw new Error("必须提供 sql 参数");
      return params.sql;
    },
  },
];

/**
 * 按工具名查找工具
 */
export function findTool(name) {
  return tools.find((t) => t.name === name);
}

/**
 * 执行工具：构建 SQL → 查询 → 返回结果
 */
export async function executeTool(name, params) {
  const tool = findTool(name);
  if (!tool) throw new Error(`未知工具: ${name}`);

  const sql = tool.build(params || {});
  const result = await runQuery(sql);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
