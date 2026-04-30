import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const required = (value: string | undefined, fallback?: string) => {
  const resolved = value ?? fallback;
  if (!resolved) {
    throw new Error('Missing required environment configuration.');
  }
  return resolved;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
  sessionSecret: required(process.env.SESSION_SECRET, 'change-this-session-secret'),
  dbHost: required(process.env.DB_HOST, '127.0.0.1'),
  dbPort: Number(process.env.DB_PORT ?? 3306),
  dbUser: required(process.env.DB_USER, 'root'),
  dbPassword: process.env.DB_PASSWORD ?? '',
  dbName: required(process.env.DB_NAME, 'voyage_planner'),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
  serpApiKey: process.env.SERPAPI_API_KEY ?? '',
  amadeusClientId: process.env.AMADEUS_CLIENT_ID ?? '',
  amadeusClientSecret: process.env.AMADEUS_CLIENT_SECRET ?? '',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
};
