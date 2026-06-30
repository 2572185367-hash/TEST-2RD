const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = 3001;

const DIFY_BASE_URL = 'api.dify.ai';
const DIFY_API_KEY = 'app-a1BvkLuB1dThIuHdzyq1u7B3';

app.use(cors());
app.use(express.json());

// 通用 Dify API 请求函数
function difyRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;

    const options = {
      hostname: DIFY_BASE_URL,
      path: `/v1${apiPath}`,
      method,
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ status: res.statusCode, data: json });
          }
        } catch (e) {
          reject({ status: res.statusCode, data: data, message: 'JSON解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.error('Dify API 请求错误:', e.message);
      reject({ status: 500, message: e.message });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ status: 504, message: '请求超时' });
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

// ========== 1. 执行工作流 ==========
app.post('/api/workflows/run', async (req, res) => {
  try {
    const { query, user = 'web-user' } = req.body;

    console.log(`[工作流] 输入: "${query}"`);

    const data = await difyRequest('POST', '/workflows/run', {
      inputs: { input: query },
      response_mode: 'blocking',
      user,
    });

    console.log(`[工作流] 成功, status=${data.data?.status}`);

    res.json({
      success: true,
      workflow_run_id: data.workflow_run_id,
      data: {
        status: data.data?.status,
        outputs: data.data?.outputs,
        elapsed_time: data.data?.elapsed_time,
        total_tokens: data.data?.total_tokens,
        total_steps: data.data?.total_steps,
        error: data.data?.error,
        created_at: data.data?.created_at,
        finished_at: data.data?.finished_at,
      },
    });
  } catch (err) {
    console.error('[工作流] 失败:', JSON.stringify(err));
    res.status(err.status || 500).json({
      success: false,
      error: true,
      message: err.data?.message || err.message || '工作流执行失败',
    });
  }
});

// ========== 2. 获取工作流日志 ==========
app.get('/api/workflows/logs', async (req, res) => {
  try {
    const { user = 'web-user', limit = 20 } = req.query;

    const data = await difyRequest('GET', `/workflows/logs?user=${encodeURIComponent(user)}&limit=${limit}&last_id=`);

    res.json({
      success: true,
      data: (data.data || []).map((item) => ({
        id: item.id,
        inputs: item.inputs,
        outputs: item.outputs,
        status: item.status,
        elapsed_time: item.elapsed_time,
        total_tokens: item.total_tokens,
        total_steps: item.total_steps,
        created_at: item.created_at,
      })),
    });
  } catch (err) {
    console.error('[日志] 失败:', err.message);
    res.status(err.status || 500).json({
      success: false,
      error: true,
      message: err.data?.message || err.message || '获取日志失败',
    });
  }
});

// ========== 3. 获取应用参数 ==========
app.get('/api/parameters', async (req, res) => {
  try {
    const data = await difyRequest('GET', '/parameters');
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      error: true,
      message: err.data?.message || err.message || '获取参数失败',
    });
  }
});

// ========== 静态文件服务 ==========
app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  论文关键词检索服务已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  API:  http://localhost:${PORT}/api/workflows/run`);
  console.log(`========================================\n`);
});
