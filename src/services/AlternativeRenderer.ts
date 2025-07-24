/**
 * 不依赖Chromium的Mermaid渲染方案
 * 方案1: 客户端渲染 - 返回HTML让浏览器渲染
 * 方案2: SVG模板 - 基于JSDOM的纯Node.js渲染（实验性）
 * 方案3: 外部服务 - 调用在线渲染API
 */

export interface AlternativeRenderOptions {
  theme: string;
  width: number;
  height: number;
  backgroundColor: string;
}

export class AlternativeRenderer {
  
  /**
   * 方案1：返回客户端渲染的HTML
   * 优点：无需服务端浏览器，渲染质量最佳
   * 缺点：需要客户端支持JavaScript
   */
  generateClientHTML(mermaidCode: string, options: AlternativeRenderOptions): string {
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
    #diagram {
      max-width: ${options.width}px;
      max-height: ${options.height}px;
    }
    .loading {
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="diagram">
    <div class="loading">正在加载图表...</div>
    <div class="mermaid" style="display: none;">
${mermaidCode}
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.9.0/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({
      theme: '${options.theme}',
      startOnLoad: false,
      securityLevel: 'loose',
      fontFamily: 'Arial, sans-serif'
    });
    
    // 渲染完成后显示图表
    mermaid.init().then(() => {
      document.querySelector('.loading').style.display = 'none';
      document.querySelector('.mermaid').style.display = 'block';
      
      // 如果是iframe，通知父窗口渲染完成
      if (window.parent !== window) {
        const svg = document.querySelector('.mermaid svg');
        if (svg) {
          const bbox = svg.getBBox();
          window.parent.postMessage({
            type: 'mermaid-rendered',
            width: bbox.width,
            height: bbox.height
          }, '*');
        }
      }
    }).catch(error => {
      document.querySelector('.loading').innerHTML = 
        '<span style="color: red;">图表渲染失败: ' + error.message + '</span>';
    });
  </script>
</body>
</html>`;
  }

  /**
   * 方案2：生成可嵌入的React/Vue组件代码
   */
  generateReactComponent(mermaidCode: string, options: AlternativeRenderOptions): string {
    return `
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

const MermaidDiagram = () => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    mermaid.initialize({
      theme: '${options.theme}',
      startOnLoad: false,
      securityLevel: 'loose'
    });
    
    if (containerRef.current) {
      mermaid.render('diagram', \`${mermaidCode}\`, containerRef.current);
    }
  }, []);
  
  return (
    <div 
      ref={containerRef}
      style={{
        backgroundColor: '${options.backgroundColor}',
        maxWidth: '${options.width}px',
        maxHeight: '${options.height}px',
        overflow: 'auto'
      }}
    />
  );
};

export default MermaidDiagram;
`;
  }

  /**
   * 方案3：外部渲染服务调用
   * 使用免费的在线Mermaid渲染API
   */
  async renderViaAPI(mermaidCode: string, options: AlternativeRenderOptions): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }> {
    try {
      // 使用 Mermaid Ink API（免费）
      const encodedCode = encodeURIComponent(mermaidCode);
      const theme = options.theme === 'dark' ? 'dark' : 'default';
      const apiUrl = `https://mermaid.ink/svg/${encodedCode}?theme=${theme}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status}`);
      }
      
      const svgContent = await response.text();
      
      // 将SVG转换为Base64
      const base64 = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
      
      return {
        success: true,
        data: base64
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 方案4：纯文本ASCII图表（备用方案）
   * 当所有其他方案都失败时的兜底
   */
  generateASCIIDiagram(mermaidCode: string): string {
    // 简单的文本解析，生成ASCII图表
    const lines = mermaidCode.split('\\n').filter(line => line.trim());
    let result = '\\n┌─ Mermaid 图表 (ASCII预览) ─┐\\n';
    
    lines.forEach((line, index) => {
      if (line.includes('-->')) {
        const parts = line.split('-->');
        if (parts.length === 2) {
          const from = parts[0].trim();
          const to = parts[1].trim();
          result += `│ ${from} → ${to}\\n`;
        }
      } else if (line.trim() && !line.includes('graph')) {
        result += `│ ${line.trim()}\\n`;
      }
    });
    
    result += '└─────────────────────────────┘\\n';
    return result;
  }
}