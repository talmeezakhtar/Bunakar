import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const production = process.env.NODE_ENV === 'production';
  // CORS_ORIGIN (comma-separated) locks the API to the site's own origin(s). Unset is only
  // allowed in local dev, where the Vite port varies - production refuses to start wide open.
  // Blank entries dropped, so an empty `CORS_ORIGIN=` counts as unset rather than slipping by.
  const listed = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const origins = listed.length > 0 ? listed : undefined;
  if (production && !origins) {
    throw new Error(
      'CORS_ORIGIN must be set in production (e.g. https://bunakar.vercel.app).',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind the host's proxy, req.ip must be the visitor's, not the proxy's - the login
  // throttle keys on it.
  if (production) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  // A JSON API: nothing to frame, sniff or render, and no referrer worth passing on.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'",
    );
    if (production) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }
    next();
  });
  // Design payloads are long, repetitive JSON (one entry per tile) - they shrink ~10x.
  app.use(compression());
  // Express defaults to 100kb - too small for a large rug's tile list.
  app.useBodyParser('json', { limit: '5mb' });
  app.enableCors(origins ? { origin: origins } : undefined);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
