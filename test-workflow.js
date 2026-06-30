const https = require('https');
const body = JSON.stringify({inputs:{input:'人工智能'},response_mode:'blocking',user:'test'});

const req = https.request({
  hostname: 'api.dify.ai',
  path: '/v1/workflows/run',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer app-a1BvkLuB1dThIuHdzyq1u7B3',
    'Content-Type': 'application/json'
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const j = JSON.parse(d);
    console.log('Outputs:', JSON.stringify(j.data?.outputs || j, null, 2));
    if (j.data?.outputs) {
      console.log('\n=== 测试通过! ===');
      console.log('工作流输出键:', Object.keys(j.data.outputs));
    }
  });
});
req.on('error', e => console.error(e.message));
req.write(body);
req.end();
