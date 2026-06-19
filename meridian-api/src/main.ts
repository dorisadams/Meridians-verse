import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { DataResponseInterceptor } from './common/interceptors/data-response.interceptor';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Apply baseline security headers (Closes #448).
  // CSP directives are relaxed for the @nestjs/swagger UI at /api which requires
  // inline scripts/styles and CDN resources. All other helmet defaults (HSTS,
  // X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control,
  // Cross-Origin policies, X-XSS-Protection, etc.) remain active.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://cdn.jsdelivr.net",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://cdn.jsdelivr.net",
            "https://fonts.googleapis.com",
          ],
          imgSrc: ["'self'", "data:", "https://validator.swagger.io"],
          fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  // CORS Configuration
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const allowedOriginsString = configService.get<string>('ALLOWED_ORIGINS');
  const allowedOrigins = allowedOriginsString
    ? allowedOriginsString.split(',').map(origin => origin.trim())
    : [];
  
  // In development, we can allow all origins if no ALLOWED_ORIGINS is set
  // In production, we strictly enforce allowed origins
  let corsOrigin: boolean | string | string[] | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
  if (nodeEnv === 'development' && allowedOrigins.length === 0) {
    corsOrigin = true;
  } else {
    corsOrigin = (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    };
  }

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Set global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Meridian API') // Add a title
    .setDescription(
      'Productivity-powered on-chain economy built on the Stellar blockchain.',
    ) // Add a description
    .setTermsOfService('http://localhost:3000/terms of service')
    .setVersion('1.0') // Set the API version
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Serve Swagger at '/api'

  //making intwerceptor global
  app.useGlobalInterceptors(new DataResponseInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
