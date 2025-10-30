import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import env from './env';

const isProd = env.NODE_ENV === 'production';

const extraOptions: any = isProd
  ? {
      ssl: {
        rejectUnauthorized: true,
      },
    }
  : {};

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
