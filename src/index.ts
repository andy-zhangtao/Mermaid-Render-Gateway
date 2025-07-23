import Fastify from 'fastify';

const fastify = Fastify({
  logger: true
});

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

start();