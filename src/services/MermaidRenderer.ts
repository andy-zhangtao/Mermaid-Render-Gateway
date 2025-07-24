import { chromium, Browser, Page } from 'playwright';
import { MermaidRenderOptions } from '../types';

export class MermaidRenderer {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw new Error('Browser initialization failed');
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

      const html = this.generateHTML(mermaidCode, options);
      await page.setContent(html);

      await page.waitForSelector('#mermaid-diagram', { timeout: 10000 });
      
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

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}