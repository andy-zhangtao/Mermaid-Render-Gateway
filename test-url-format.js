const http = require('http');
const fs = require('fs');

// 测试URL格式的完整工作流程
async function testURLFormat() {
  console.log('🚀 测试URL格式功能...\n');

  // 第一步：请求渲染并获取URL
  const renderRequest = {
    mermaid: "graph TD\n  A --> B\n  B --> C",
    format: 'url'
  };

  try {
    console.log('📝 第一步：请求渲染并获取URL...');
    const urlResponse = await makeRequest('/render', 'POST', renderRequest);
    
    console.log('🔍 调试响应:', JSON.stringify(urlResponse, null, 2));
    
    if (!urlResponse.success) {
      throw new Error(`渲染失败: ${urlResponse.error?.message || '未知错误'}`);
    }

    console.log('✅ 渲染成功！');
    console.log(`📊 图片尺寸: ${urlResponse.metadata.width} x ${urlResponse.metadata.height}`);
    console.log(`⏱️  渲染耗时: ${urlResponse.metadata.renderTime}ms`);
    console.log(`🔗 下载URL: ${urlResponse.data}`);
    console.log(`📄 文件类型: ${urlResponse.metadata.contentType}\n`);

    // 第二步：通过返回的URL下载图片
    console.log('📥 第二步：通过URL下载图片...');
    const imageBuffer = await downloadFile(urlResponse.data);
    
    // 保存到本地文件
    const filename = 'workflow_diagram.png';
    fs.writeFileSync(filename, imageBuffer);
    
    console.log(`✅ 图片下载成功！`);
    console.log(`💾 已保存为: ${filename}`);
    console.log(`📦 文件大小: ${imageBuffer.length} 字节\n`);

    // 验证文件
    console.log('🔍 第三步：验证下载的文件...');
    if (fs.existsSync(filename)) {
      const stats = fs.statSync(filename);
      console.log(`✅ 文件验证成功！`);
      console.log(`📏 文件大小: ${stats.size} 字节`);
      console.log(`📅 创建时间: ${stats.birthtime.toISOString()}`);
    }

    console.log('\n🎉 URL格式功能测试完成！');
    console.log('📋 工作流程总结:');
    console.log('   1. POST /render (format=url) → 获取临时URL');
    console.log('   2. GET /tmp/filename.png → 下载PNG图片');
    console.log('   3. 客户端成功获得高质量PNG图片');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// HTTP请求辅助函数
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: method === 'POST' ? {
        'Content-Type': 'application/json',
        'Content-Length': JSON.stringify(data).length
      } : {}
    };

    const req = http.request(options, (res) => {
      let body = Buffer.alloc(0);
      
      res.on('data', (chunk) => {
        body = Buffer.concat([body, chunk]);
      });
      
      res.on('end', () => {
        try {
          if (res.headers['content-type']?.includes('application/json')) {
            resolve(JSON.parse(body.toString()));
          } else {
            resolve(body);
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 下载文件辅助函数
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: url,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败，状态码: ${res.statusCode}`));
        return;
      }

      let body = Buffer.alloc(0);
      
      res.on('data', (chunk) => {
        body = Buffer.concat([body, chunk]);
      });
      
      res.on('end', () => {
        resolve(body);
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 运行测试
testURLFormat().catch(console.error);