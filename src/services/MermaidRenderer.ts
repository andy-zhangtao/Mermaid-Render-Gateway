import { chromium, Browser, Page } from 'playwright';
import { MermaidRenderOptions } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface RenderResult {
  data: string | Buffer;
  width: number;
  height: number;
  renderTime: number;
  mimeType?: string;
}

export class MermaidRenderer {
  private browser: Browser | null = null;
  private tempDir: string;

  constructor() {
    // 创建临时文件目录
    this.tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    try {
      const launchOptions: any = {
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-sync',
          '--memory-pressure-off',
          '--max-old-space-size=4096'
        ],
        timeout: 60000
      };

      // 如果有指定Chrome路径，使用指定路径
      if (process.env.CHROME_PATH) {
        console.log(`🚀 使用指定Chrome: ${process.env.CHROME_PATH}`);
        launchOptions.executablePath = process.env.CHROME_PATH;
      } else {
        console.log('🚀 使用Playwright内置Chromium');
      }

      this.browser = await chromium.launch(launchOptions);
      console.log('✅ 浏览器初始化成功');
    } catch (error) {
      console.error('❌ 浏览器启动失败:', error);
      
      // 如果指定路径失败，尝试使用内置浏览器
      if (process.env.CHROME_PATH) {
        console.log('🔄 尝试使用Playwright内置浏览器...');
        try {
          this.browser = await chromium.launch({
            headless: true,
            args: [
              '--no-sandbox', 
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu'
            ]
          });
          console.log('✅ 使用内置浏览器成功');
          return;
        } catch (fallbackError) {
          console.error('❌ 内置浏览器也启动失败:', fallbackError);
        }
      }
      
      throw new Error('Browser initialization failed. Please check Chrome installation or run: npx playwright install chromium');
    }
  }

  async renderToBase64(mermaidCode: string, options: MermaidRenderOptions): Promise<{
    base64: string;
    width: number;
    height: number;
    renderTime: number;
  }> {
    const startTime = Date.now();
    
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    try {
      await page.setViewportSize({ 
        width: options.width, 
        height: options.height 
      });

      const html = this.generateOfflineHTML(mermaidCode, options);
      
      // 设置页面内容，增加超时时间
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      // 等待 Mermaid 脚本加载
      await page.waitForFunction('typeof window !== "undefined" && typeof window.mermaid !== "undefined"', { timeout: 30000 });
      
      // 等待图表渲染完成
      await page.waitForSelector('#mermaid-diagram svg', { timeout: 30000 });
      
      const svgElement = await page.$('#mermaid-diagram svg');
      if (!svgElement) {
        throw new Error('Mermaid diagram not found after rendering');
      }

      const boundingBox = await svgElement.boundingBox();
      if (!boundingBox) {
        throw new Error('Could not get diagram dimensions');
      }

      const screenshot = await svgElement.screenshot({
        type: 'png',
        omitBackground: options.backgroundColor === 'transparent'
      });

      const base64 = `data:image/png;base64,${screenshot.toString('base64')}`;
      const renderTime = Date.now() - startTime;

      return {
        base64,
        width: Math.round(boundingBox.width),
        height: Math.round(boundingBox.height),
        renderTime
      };
    } finally {
      await page.close();
    }
  }

  private generateHTML(mermaidCode: string, options: MermaidRenderOptions): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: ${options.backgroundColor};
      font-family: Arial, sans-serif;
    }
    #mermaid-diagram {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.9.0/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="mermaid-diagram">
    <div class="mermaid">
${mermaidCode}
    </div>
  </div>
  
  <script>
    mermaid.initialize({
      theme: '${options.theme}',
      startOnLoad: true,
      securityLevel: 'loose',
      fontFamily: 'Arial, sans-serif'
    });
    
    mermaid.init();
  </script>
</body>
</html>`;
  }

  /**
   * 渲染为PNG二进制数据
   */
  async renderToPNG(mermaidCode: string, options: MermaidRenderOptions): Promise<RenderResult> {
    const result = await this.renderToBase64(mermaidCode, options);
    const base64Data = result.base64.replace('data:image/png;base64,', '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    return {
      data: buffer,
      width: result.width,
      height: result.height,
      renderTime: result.renderTime,
      mimeType: 'image/png'
    };
  }

  /**
   * 渲染为JPEG格式
   */
  async renderToJPEG(mermaidCode: string, options: MermaidRenderOptions, quality: number = 90): Promise<RenderResult> {
    const startTime = Date.now();
    
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    try {
      await page.setViewportSize({ 
        width: options.width, 
        height: options.height 
      });

      const html = this.generateOfflineHTML(mermaidCode, options);
      
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      await page.waitForFunction('typeof window !== "undefined" && typeof window.mermaid !== "undefined"', { timeout: 30000 });
      await page.waitForSelector('#mermaid-diagram svg', { timeout: 30000 });
      
      const svgElement = await page.$('#mermaid-diagram svg');
      if (!svgElement) {
        throw new Error('Mermaid diagram not found after rendering');
      }

      const boundingBox = await svgElement.boundingBox();
      if (!boundingBox) {
        throw new Error('Could not get diagram dimensions');
      }

      const screenshot = await svgElement.screenshot({
        type: 'jpeg',
        quality: quality,
        omitBackground: options.backgroundColor === 'transparent'
      });

      const renderTime = Date.now() - startTime;

      return {
        data: screenshot,
        width: Math.round(boundingBox.width),
        height: Math.round(boundingBox.height),
        renderTime,
        mimeType: 'image/jpeg'
      };
    } finally {
      await page.close();
    }
  }

  /**
   * 渲染为SVG矢量图
   */
  async renderToSVG(mermaidCode: string, options: MermaidRenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    try {
      const html = this.generateOfflineHTML(mermaidCode, options);
      
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      await page.waitForFunction('typeof window !== "undefined" && typeof window.mermaid !== "undefined"', { timeout: 30000 });
      await page.waitForSelector('#mermaid-diagram svg', { timeout: 30000 });
      
      // 获取SVG内容
      const svgContent = await page.$eval('#mermaid-diagram svg', el => el.outerHTML);
      
      // 获取SVG尺寸
      const { width, height } = await page.$eval('#mermaid-diagram svg', el => {
        const bbox = el.getBBox();
        return { width: bbox.width, height: bbox.height };
      });

      const renderTime = Date.now() - startTime;

      return {
        data: svgContent,
        width: Math.round(width),
        height: Math.round(height),
        renderTime,
        mimeType: 'image/svg+xml'
      };
    } finally {
      await page.close();
    }
  }

  /**
   * 渲染为HTML页面
   */
  async renderToHTML(mermaidCode: string, options: MermaidRenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    
    const html = this.generateStandaloneHTML(mermaidCode, options);
    const renderTime = Date.now() - startTime;

    return {
      data: html,
      width: options.width,
      height: options.height,
      renderTime,
      mimeType: 'text/html'
    };
  }

  /**
   * 渲染为PDF文档
   */
  async renderToPDF(mermaidCode: string, options: MermaidRenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    try {
      const html = this.generateOfflineHTML(mermaidCode, options);
      
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      await page.waitForFunction('typeof window !== "undefined" && typeof window.mermaid !== "undefined"', { timeout: 30000 });
      await page.waitForSelector('#mermaid-diagram svg', { timeout: 30000 });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });

      const renderTime = Date.now() - startTime;

      return {
        data: pdfBuffer,
        width: 595, // A4宽度 (pts)
        height: 842, // A4高度 (pts)
        renderTime,
        mimeType: 'application/pdf'
      };
    } finally {
      await page.close();
    }
  }

  /**
   * 生成临时URL访问 - 专门用于PNG格式
   * 将图表渲染为PNG并保存到临时目录，返回可访问的HTTP URL
   */
  async renderToURL(mermaidCode: string, options: MermaidRenderOptions): Promise<RenderResult> {
    // 渲染为PNG格式
    const pngResult = await this.renderToPNG(mermaidCode, options);

    // 生成唯一文件名
    const timestamp = Date.now();
    const hash = Math.random().toString(36).substring(2);
    const filename = `mermaid_${timestamp}_${hash}.png`;
    const filePath = path.join(this.tempDir, filename);

    // 保存PNG文件到临时目录
    fs.writeFileSync(filePath, pngResult.data);
    
    console.log(`✅ PNG文件已保存: ${filePath}`);

    // 返回可通过HTTP访问的URL
    const url = `/tmp/${filename}`;

    return {
      data: url,
      width: pngResult.width,
      height: pngResult.height,
      renderTime: pngResult.renderTime,
      mimeType: 'text/plain'
    };
  }

  /**
   * 生成独立的HTML页面
   */
  private generateStandaloneHTML(mermaidCode: string, options: MermaidRenderOptions): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mermaid Diagram</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: ${options.backgroundColor};
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    #mermaid-diagram {
      max-width: 100%;
      overflow: auto;
    }
    .mermaid {
      max-width: ${options.width}px;
      max-height: ${options.height}px;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.9.0/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="mermaid-diagram">
    <div class="mermaid">
${mermaidCode}
    </div>
  </div>
  
  <script>
    mermaid.initialize({
      theme: '${options.theme}',
      startOnLoad: true,
      securityLevel: 'loose',
      fontFamily: 'Arial, sans-serif'
    });
  </script>
</body>
</html>`;
  }

  /**
   * 生成离线HTML，避免CDN依赖
   */
  private generateOfflineHTML(mermaidCode: string, options: MermaidRenderOptions): string {
    // 读取本地 mermaid.js 文件
    const mermaidPath = require.resolve('mermaid/dist/mermaid.min.js');
    const mermaidScript = require('fs').readFileSync(mermaidPath, 'utf8');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: ${options.backgroundColor};
      font-family: Arial, sans-serif;
    }
    #mermaid-diagram {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  </style>
</head>
<body>
  <div id="mermaid-diagram">
    <div class="mermaid">
${mermaidCode}
    </div>
  </div>
  
  <script>
${mermaidScript}
  </script>
  <script>
    try {
      mermaid.initialize({
        theme: '${options.theme}',
        startOnLoad: true,
        securityLevel: 'loose',
        fontFamily: 'Arial, sans-serif'
      });
      
      mermaid.init();
      console.log('Mermaid initialized successfully');
    } catch (error) {
      console.error('Mermaid initialization error:', error);
    }
  </script>
</body>
</html>`;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    
    // 清理临时文件（可选）
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        const now = Date.now();
        files.forEach(file => {
          const filePath = path.join(this.tempDir, file);
          const stats = fs.statSync(filePath);
          // 删除超过1小时的临时文件
          if (now - stats.mtime.getTime() > 3600000) {
            fs.unlinkSync(filePath);
          }
        });
      }
    } catch (error) {
      console.warn('清理临时文件失败:', error);
    }
  }
}