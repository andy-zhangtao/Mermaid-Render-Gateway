export interface RenderRequest {
  mermaid: string;
  format: 'base64' | 'png' | 'jpeg' | 'svg' | 'pdf' | 'html' | 'url';
  options?: {
    theme?: 'default' | 'dark' | 'neutral';
    width?: number;
    height?: number;
    backgroundColor?: string;
    // 新增选项
    quality?: number; // JPEG质量 (1-100)
    scale?: number;   // 缩放比例
    timeout?: number; // 渲染超时时间
  };
}

export interface RenderResponse {
  success: boolean;
  format: string;
  data?: string;
  metadata?: {
    width: number;
    height: number;
    renderTime: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface MermaidRenderOptions {
  theme: string;
  width: number;
  height: number;
  backgroundColor: string;
}