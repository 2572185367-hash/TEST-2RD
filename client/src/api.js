// API 工具函数
const API_BASE = '/api';

/**
 * 执行工作流（核心接口 - 论文关键词检索）
 */
export async function runWorkflow({ query, inputs = {}, user = 'web-user' }) {
  const res = await fetch(`${API_BASE}/workflows/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, inputs, user }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '工作流执行失败');
  return data;
}

/**
 * 获取工作流执行日志
 */
export async function getWorkflowLogs(user = 'web-user', limit = 20) {
  const res = await fetch(`${API_BASE}/workflows/logs?user=${user}&limit=${limit}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '获取日志失败');
  return data;
}

/**
 * 获取应用参数
 */
export async function getParameters() {
  const res = await fetch(`${API_BASE}/parameters`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '获取参数失败');
  return data;
}
