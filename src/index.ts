import 'dotenv/config';
import Fastify from 'fastify';
import { RenderController } from './controllers/RenderController';
import * as path from 'path';

const fastify = Fastify({
  logger: true
});

// 注册静态文件服务用于临时文件访问
fastify.register(require('@fastify/static'), {
  root: path.join(process.cwd(), 'tmp'),
  prefix: '/tmp/'
});

const renderController = new RenderController();

fastify.get('/', async (request, reply) => {
  return { message: 'Mermaid Render Gateway is running!' };
});

fastify.get('/health', async (request, reply) => {
  return { 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mermaid-render-gateway'
  };
});

fastify.post('/render', {
  schema: {
    body: {
      type: 'object',
      required: ['mermaid'],
      properties: {
        mermaid: { type: 'string' },
        format: { 
          type: 'string', 
          enum: ['base64', 'png', 'jpeg', 'svg', 'pdf', 'html', 'url'],
          default: 'base64'
        },
        options: {
          type: 'object',
          properties: {
            theme: { 
              type: 'string', 
              enum: ['default', 'dark', 'neutral'],
              default: 'default'
            },
            width: { type: 'number', minimum: 100, maximum: 2000, default: 800 },
            height: { type: 'number', minimum: 100, maximum: 2000, default: 600 },
            backgroundColor: { type: 'string', default: '#ffffff' },
            quality: { type: 'number', minimum: 1, maximum: 100, default: 90 },
            scale: { type: 'number', minimum: 0.1, maximum: 3.0, default: 1.0 },
            timeout: { type: 'number', minimum: 1000, maximum: 30000, default: 10000 }
          }
        }
      }
    }
  }
}, renderController.render.bind(renderController));

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await renderController.cleanup();
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await renderController.cleanup();
  await fastify.close();
  process.exit(0);
});

start();