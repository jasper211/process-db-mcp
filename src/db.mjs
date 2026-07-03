/**
 * db.mjs — Metabase API 数据访问层
 *
 * 职责：封装 Metabase 会话管理和 SQL 查询执行，
 * 为上层 tools.mjs 提供统一的 runQuery 接口。
 *
 * 依赖方向：server.mjs → tools.mjs → db.mjs（单向，无循环）
 */

// ── 默认配置（可被环境变量覆盖）──
const DEFAULTS = {
  url: "http://43.98.163.46:3005",
  username: "mark@mga.hk",
  password: "Mga2026!admin",
  databaseId: 2,
};

// ── 加载配置 ──
function getConfig() {
  return {
    url: process.env.METABASE_URL || DEFAULTS.url,
    username: process.env.METABASE_USERNAME || DEFAULTS.username,
    password: process.env.METABASE_PASSWORD || DEFAULTS.password,
    databaseId: parseInt(process.env.METABASE_DB_ID || String(DEFAULTS.databaseId), 10),
  };
}

// ── 会话缓存（避免每次查询都重新登录）──
let sessionCache = null;

// ── Metabase 登录 ──
async function getSession(config) {
  if (sessionCache) return sessionCache;

  const res = await fetch(`${config.url}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: config.username,
      password: config.password,
    }),
  });

  if (!res.ok) {
    sessionCache = null;
    throw new Error(`Metabase 登录失败 (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  sessionCache = data.id;
  return sessionCache;
}

/**
 * 执行 SQL 查询
 * @param {string} sql - SQL 语句
 * @returns {Promise<{columns: string[], row_count: number, rows: object[]}>}
 */
export async function runQuery(sql) {
  const config = getConfig();
  const sessionId = await getSession(config);

  const res = await fetch(`${config.url}/api/dataset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Metabase-Session": sessionId,
    },
    body: JSON.stringify({
      database: config.databaseId,
      type: "native",
      native: { query: sql },
    }),
  });

  if (!res.ok) {
    // Session 可能过期，清除缓存
    if (res.status === 401) sessionCache = null;
    throw new Error(`查询失败 (${res.status}): ${await res.text()}`);
  }

  const result = await res.json();

  if (result.error) {
    throw new Error(`SQL 执行错误: ${result.error}`);
  }

  // 转成行对象数组
  const columns = result.data.cols.map((c) => c.name);
  const rows = (result.data.rows || []).map((row) => {
    const obj = {};
    columns.forEach((col, i) => (obj[col] = row[i]));
    return obj;
  });

  return { columns, row_count: rows.length, rows };
}

/**
 * 重置会话（用于测试或连接恢复）
 */
export function resetSession() {
  sessionCache = null;
}
