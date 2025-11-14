import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config as loadEnv } from 'dotenv';
import { GeminiService } from './services/gemini';
import type { CoursewareBuildRequest, GenerationRequest } from './types';

loadEnv();

export const createServer = (): FastifyInstance => {
  const app = fastify({
    logger: true,
  });

  const gemini = new GeminiService();
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:5173'];

  void app.register(cors, {
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'courseware-generator',
    geminiConfigured: gemini.isConfigured(),
  }));

  app.post<{ Body: GenerationRequest }>('/api/outline', async (request, reply) => {
    const body = request.body;

    if (!body?.topic || !body?.audience) {
      return reply.status(400).send({
        error: 'INVALID_REQUEST',
        message: 'topic and audience are required fields.',
      });
    }

    if (body.objectives && !Array.isArray(body.objectives)) {
      return reply.status(400).send({
        error: 'INVALID_OBJECTIVES',
        message: 'objectives must be an array of strings when provided.',
      });
    }

    if (body.interactionTypes && !Array.isArray(body.interactionTypes)) {
      return reply.status(400).send({
        error: 'INVALID_INTERACTION_TYPES',
        message: 'interactionTypes must be an array when provided.',
      });
    }

    try {
      const outline = await gemini.generateOutline(body);
      return reply.status(200).send(outline);
    } catch (error) {
      request.log.error(error, 'Failed to generate outline');
      return reply.status(500).send({
        error: 'OUTLINE_GENERATION_FAILED',
        message: '生成课程大纲时出现问题，请稍后再试。',
      });
    }
  });

  app.post<{ Body: CoursewareBuildRequest }>('/api/courseware', async (request, reply) => {
    const body = request.body;

    if (!body?.outline || !body?.request) {
      return reply.status(400).send({
        error: 'INVALID_REQUEST',
        message: 'outline 与 request 字段不能为空。',
      });
    }

    try {
      const coursewareArtifact = await gemini.generateCourseware(body);
      return reply.status(200).send(coursewareArtifact);
    } catch (error) {
      request.log.error(error, 'Failed to generate courseware');
      return reply.status(500).send({
        error: 'COURSEWARE_GENERATION_FAILED',
        message: '生成课件时出现问题，请稍后再试。',
      });
    }
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error, 'Unhandled error');
    reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: '服务暂时不可用，请稍后再试。',
    });
  });

  return app;
};

const start = async () => {
  const server = createServer();
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '0.0.0.0';

  try {
    await server.listen({ port, host });
  } catch (error) {
    server.log.error(error, 'Failed to start server');
    process.exit(1);
  }
};

if (require.main === module) {
  void start();
}

