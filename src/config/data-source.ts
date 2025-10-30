import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import env from './env';
import * as fs from 'fs';
import * as path from 'path';

const isProd = env.NODE_ENV === 'production';
let extraOptions: any = {};

if (isProd) {
  const rdsCaPath = path.join(__dirname, '..', 'certs', 'rds-ca.pem');

  if (fs.existsSync(rdsCaPath)) {
    extraOptions = {
      ssl: {
        ca: fs.readFileSync(rdsCaPath).toString(),
        rejectUnauthorized: true,
      },
    };
  } else {
    console.warn('RDS Root CA file not found! Connection might fail.');
  }
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  synchronize: env.NODE_ENV === 'development',
  ssl: isProd,
  logging: env.NODE_ENV === 'development',
  entities: [__dirname + '/../entities/*.{ts,js}'],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  subscribers: [],
  extra: extraOptions,
} as DataSourceOptions);
