import { FastifyRequest, FastifyReply } from 'fastify';
import { MermaidRenderer, RenderResult } from '../services/MermaidRenderer';
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

      let result: RenderResult;

      switch (format) {
        case 'base64':
          const base64Result = await this.renderer.renderToBase64(mermaid, renderOptions);
          return reply.send({
            success: true,
            format: 'base64',
            data: base64Result.base64,
            metadata: {
              width: base64Result.width,
              height: base64Result.height,
              renderTime: base64Result.renderTime
            }
          } as RenderResponse);

        case 'png':
          result = await this.renderer.renderToPNG(mermaid, renderOptions);
          reply.header('Content-Type', 'image/png');
          reply.header('Content-Disposition', 'inline; filename="mermaid.png"');
          return reply.send(result.data);

        case 'jpeg':
          const quality = options.quality || 90;
          result = await this.renderer.renderToJPEG(mermaid, renderOptions, quality);
          reply.header('Content-Type', 'image/jpeg');
          reply.header('Content-Disposition', 'inline; filename="mermaid.jpg"');
          return reply.send(result.data);

        case 'svg':
          result = await this.renderer.renderToSVG(mermaid, renderOptions);
          reply.header('Content-Type', 'image/svg+xml');
          reply.header('Content-Disposition', 'inline; filename="mermaid.svg"');
          return reply.send(result.data);

        case 'pdf':
          result = await this.renderer.renderToPDF(mermaid, renderOptions);
          reply.header('Content-Type', 'application/pdf');
          reply.header('Content-Disposition', 'inline; filename="mermaid.pdf"');
          return reply.send(result.data);

        case 'html':
          result = await this.renderer.renderToHTML(mermaid, renderOptions);
          reply.header('Content-Type', 'text/html');
          return reply.send(result.data);

        case 'url':
          result = await this.renderer.renderToURL(mermaid, renderOptions, 'png');
          return reply.send({
            success: true,
            format: 'url',
            data: result.data,
            metadata: {
              width: result.width,
              height: result.height,
              renderTime: result.renderTime
            }
          } as RenderResponse);

        default:
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_FORMAT',
              message: 'Format must be one of: base64, png, jpeg, svg, pdf, html, url'
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