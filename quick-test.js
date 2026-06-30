const http = require('http');
const d = JSON.stringify({ query: '人工智能', user: 'test' });
const r = http.request({
  hostname: 'localhost', port: 3001,
  path: '/api/workflows/run', method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    const j = JSON.parse(b);
    console.log('Status:', j.success ? 'SUCCESS' : 'FAILED');
    if (j.data) {
      console.log('Workflow Status:', j.data.status);
      console.log('Output keys:', Object.keys(j.data.outputs || {}));
      console.log('Output preview:', JSON.stringify(j.data.outputs || {}).substring(0, 600));
      console.log('Elapsed:', j.data.elapsed_time, 's');
      console.log('Tokens:', j.data.total_tokens);
    } else {
      console.log('Response:', JSON.stringify(j).substring(0, 600));
    }
  });
});
r.on('error', e => console.error('Error:', e.message));
r.write(d);
r.end();
