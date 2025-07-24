const http = require('http');

const testData = {
  mermaid: `graph TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作A]
    B -->|否| D[执行操作B]
    C --> E[结束]
    D --> E`,
  format: 'base64',
  options: {
    theme: 'default',
    width: 800,
    height: 600,
    backgroundColor: '#ffffff'
  }
};

const data = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/render',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);
  
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      if (response.success) {
        console.log('✅ 渲染成功！');
        console.log(`📊 元数据:`, response.metadata);
        console.log(`🖼️  Base64长度: ${response.data.length} 字符`);
      } else {
        console.log('❌ 渲染失败:', response.error);
      }
    } catch (error) {
      console.log('解析响应失败:', body);
    }
  });
});

req.on('error', (e) => {
  console.error(`请求出错: ${e.message}`);
});

req.write(data);
req.end();