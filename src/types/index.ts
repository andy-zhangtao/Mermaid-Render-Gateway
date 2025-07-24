export interface RenderRequest {
  mermaid: string;
  format: 'base64' | 'url' | 'binary';
  options?: {
    theme?: 'default' | 'dark' | 'neutral';
    width?: number;
    height?: number;
    backgroundColor?: string;
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