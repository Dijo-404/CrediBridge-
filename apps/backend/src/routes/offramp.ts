import { FastifyInstance } from 'fastify';
import { getSession, getVendor } from '../db/store';
import { simulateOfframp } from '../services/offramp';

interface OfframpRequestBody {
  sessionId?: string;
}

export async function registerOfframpRoutes(app: FastifyInstance) {
  app.post('/api/offramp/mock', async (request, reply) => {
    const body = request.body as OfframpRequestBody;

    if (!body?.sessionId) {
      reply.code(400).send({ error: 'sessionId is required' });
      return;
    }

    const session = getSession(body.sessionId);
    if (!session) {
      reply.code(404).send({ error: 'Session not found' });
      return;
    }

    const vendor = getVendor(session.vendor_id);
    if (!vendor) {
      reply.code(404).send({ error: 'Vendor not found' });
      return;
    }

    const offramp = await simulateOfframp(session, vendor);
    reply.send({ offramp });
  });
}
