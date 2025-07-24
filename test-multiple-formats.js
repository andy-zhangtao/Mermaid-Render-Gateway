const http = require('http');
const fs = require('fs');

const testData = {
  mermaid: "graph TD\n  A[开始] --> B{判断条件}\n  B -->|是| C[执行操作A]\n  B -->|否| D[执行操作B]\n  C --> E[结束]\n  D --> E",
  options: {
    theme: 'default',
    width: 800,
    height: 600,
    backgroundColor: '#ffffff'
  }
};

// 测试所有格式
const formats = ['base64', 'png', 'jpeg', 'svg', 'pdf', 'html', 'url'];

async function testFormat(format) {
  return new Promise((resolve, reject) => {
    const requestData = {
      ...testData,
      format: format
    };

    const data = JSON.stringify(requestData);

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/render',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      console.log(`\n🧪 测试格式: ${format}`);
      console.log(`📊 状态码: ${res.statusCode}`);
      console.log(`📋 Content-Type: ${res.headers['content-type']}`);
      
      let body = Buffer.alloc(0);
      
      res.on('data', (chunk) => {
        body = Buffer.concat([body, chunk]);
      });
      
      res.on('end', () => {
        try {
          // 检查状态码
          if (res.statusCode !== 200) {
            console.log('❌ HTTP错误');
            console.log('📄 响应内容:', body.toString());
            resolve();
            return;
          }

          if (format === 'base64' || format === 'url') {
            // JSON 响应
            const response = JSON.parse(body.toString());
            if (response.success) {
              console.log('✅ 渲染成功！');
              console.log(`📈 元数据:`, response.metadata);
              if (format === 'base64') {
                console.log(`🖼️  Base64长度: ${response.data.length} 字符`);
              } else if (format === 'url') {
                console.log(`🔗 URL: ${response.data}`);
              }
            } else {
              console.log('❌ 渲染失败:', response.error);
            }
          } else {
            // 二进制响应
            console.log('✅ 渲染成功！');
            console.log(`📦 数据大小: ${body.length} 字节`);
            
            // 保存文件到本地进行验证
            const extension = {
              'png': 'png',
              'jpeg': 'jpg', 
              'svg': 'svg',
              'pdf': 'pdf',
              'html': 'html'
            }[format];
            
            const filename = `test_output.${extension}`;
            fs.writeFileSync(filename, body);
            console.log(`💾 已保存为: ${filename}`);
          }
          resolve();
        } catch (error) {
          console.log('❌ 解析响应失败:', error.message);
          console.log('📄 原始响应:', body.toString().substring(0, 500));
          reject(error);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ 请求出错 (${format}): ${e.message}`);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 开始测试多种输出格式...\n');
  
  for (const format of formats) {
    try {
      await testFormat(format);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    } catch (error) {
      console.error(`格式 ${format} 测试失败:`, error.message);
    }
  }
  
  console.log('\n🎉 所有格式测试完成！');
}

runTests().catch(console.error);