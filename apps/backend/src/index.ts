import Fastify from 'fastify';
import { registerSessionRoutes } from './routes/sessions';
import { registerWebhookRoutes } from './routes/webhooks';
import { registerVendorRoutes } from './routes/vendors';
import { registerOfframpRoutes } from './routes/offramp';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ ok: true }));

const start = async () => {
  await registerSessionRoutes(app);
  await registerWebhookRoutes(app);
  await registerVendorRoutes(app);
  await registerOfframpRoutes(app);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: '0.0.0.0' });
};

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
