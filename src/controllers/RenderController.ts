import { FastifyRequest, FastifyReply } from 'fastify';
import { MermaidRenderer } from '../services/MermaidRenderer';
import { RenderRequest, RenderResponse, MermaidRenderOptions } from '../types';

export class RenderController {
  private renderer: MermaidRenderer;

  constructor() {
    this.renderer = new MermaidRenderer();
  }

  async render(request: FastifyRequest<{ Body: RenderRequest }>, reply: FastifyReply): Promise<void> {
    try {
      const { mermaid, format = 'base64', options = {} } = request.body;

      if (!mermaid || typeof mermaid !== 'string') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Mermaid code is required and must be a string'
          }
        } as RenderResponse);
      }

      const renderOptions: MermaidRenderOptions = {
        theme: options.theme || 'default',
        width: options.width || 800,
        height: options.height || 600,
        backgroundColor: options.backgroundColor || '#ffffff'
      };

      switch (format) {
        case 'base64':
          const result = await this.renderer.renderToBase64(mermaid, renderOptions);
          
          return reply.send({
            success: true,
            format: 'base64',
            data: result.base64,
            metadata: {
              width: result.width,
              height: result.height,
              renderTime: result.renderTime
            }
          } as RenderResponse);

        case 'url':
        case 'binary':
          return reply.status(501).send({
            success: false,
            error: {
              code: 'NOT_IMPLEMENTED',
              message: `Format '${format}' is not yet implemented`
            }
          } as RenderResponse);

        default:
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_FORMAT',
              message: 'Format must be one of: base64, url, binary'
            }
          } as RenderResponse);
      }
    } catch (error) {
      console.error('Render error:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'RENDER_FAILED',
          message: error instanceof Error ? error.message : 'Unknown rendering error',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      } as RenderResponse);
    }
  }

  async cleanup(): Promise<void> {
    await this.renderer.close();
  }
}