#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Chrome/Chromium 自动检测和配置脚本
 * 优先级：用户指定 > 系统检测 > Playwright内置
 */

const CHROME_PATHS = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable', 
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/google-chrome-unstable'
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
  ]
};

function findSystemChrome() {
  const platform = process.platform;
  const possiblePaths = CHROME_PATHS[platform] || [];
  
  console.log(`🔍 检测平台: ${platform}`);
  
  // 检查每个可能的路径
  for (const chromePath of possiblePaths) {
    const expandedPath = chromePath.replace('%USERNAME%', process.env.USERNAME || '');
    
    try {
      if (fs.existsSync(expandedPath)) {
        console.log(`✅ 找到Chrome: ${expandedPath}`);
        return expandedPath;
      }
    } catch (error) {
      // 忽略权限错误，继续检查下一个
    }
  }
  
  // 尝试使用which/where命令
  try {
    const whichCmd = platform === 'win32' ? 'where' : 'which';
    const chromeNames = platform === 'win32' 
      ? ['chrome', 'google-chrome'] 
      : ['google-chrome', 'chromium', 'google-chrome-stable'];
    
    for (const name of chromeNames) {
      try {
        const result = execSync(`${whichCmd} ${name}`, { 
          encoding: 'utf8', 
          stdio: 'pipe' 
        }).trim();
        
        if (result && fs.existsSync(result)) {
          console.log(`✅ 通过${whichCmd}找到Chrome: ${result}`);
          return result;
        }
      } catch (error) {
        // 继续尝试下一个
      }
    }
  } catch (error) {
    // which/where命令失败，继续
  }
  
  return null;
}

function setupChrome() {
  console.log('🚀 开始配置Chrome/Chromium...');
  
  // 1. 检查用户是否已设置环境变量
  if (process.env.CHROME_PATH) {
    if (fs.existsSync(process.env.CHROME_PATH)) {
      console.log(`✅ 使用用户指定的Chrome: ${process.env.CHROME_PATH}`);
      return;
    } else {
      console.log(`⚠️  用户指定的Chrome路径不存在: ${process.env.CHROME_PATH}`);
    }
  }
  
  // 2. 自动检测系统Chrome
  const detectedPath = findSystemChrome();
  
  if (detectedPath) {
    process.env.CHROME_PATH = detectedPath;
    console.log(`✅ 自动设置Chrome路径: ${detectedPath}`);
    
    // 写入.env文件供后续使用
    const envContent = `CHROME_PATH="${detectedPath}"\\n`;
    try {
      fs.writeFileSync('.env', envContent);
      console.log('📝 Chrome路径已保存到.env文件');
    } catch (error) {
      console.log('⚠️  无法写入.env文件，将使用临时环境变量');
    }
    return;
  }
  
  // 3. 都找不到，给出提示
  console.log('❌ 未找到系统Chrome/Chromium');
  console.log('');
  console.log('🔧 解决方案:');
  console.log('1. 安装Chrome: https://www.google.com/chrome/');
  console.log('2. 安装Chromium: https://www.chromium.org/');
  console.log('3. 安装Playwright浏览器: npx playwright install chromium');
  console.log('4. 手动指定路径: export CHROME_PATH="/path/to/chrome"');
  console.log('');
  console.log('⚡ 服务将尝试使用Playwright内置浏览器...');
}

// 运行配置
if (require.main === module) {
  setupChrome();
}

module.exports = { findSystemChrome, setupChrome };