import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { env } from './env';

const MySQLStore = MySQLStoreFactory(session);

export const sessionStore = new MySQLStore(
  {
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    createDatabaseTable: true,
    schema: {
      tableName: 'user_sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires_at',
        data: 'session_data',
      },
    },
  },
  undefined,
);
