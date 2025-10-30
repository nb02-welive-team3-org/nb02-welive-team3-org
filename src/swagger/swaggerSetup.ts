import fs from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import yaml from 'js-yaml';

export const setupSwagger = (app: Application) => {
  const swaggerFile = path.join(__dirname, 'openapi.yaml');
  const swaggerDocument:any = yaml.load(fs.readFileSync(swaggerFile, 'utf8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('Swagger UI: /api/docs');
};
