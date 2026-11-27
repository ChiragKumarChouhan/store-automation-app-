import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'store_automation',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ?? '',
  },
  jwtSecret: process.env.JWT_SECRET || 'abesec_store_automation_2026_fallback_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  demoAdminUsername: process.env.DEMO_ADMIN_USERNAME || 'admin',
  demoAdminPassword: process.env.DEMO_ADMIN_PASSWORD || 'Admin@123',
  demoStudentUsername: process.env.DEMO_STUDENT_USERNAME || 'student',
  demoStudentPassword: process.env.DEMO_STUDENT_PASSWORD || 'Student@123',
};
