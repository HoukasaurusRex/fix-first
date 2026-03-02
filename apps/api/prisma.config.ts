import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // process.env used (not env()) so prisma generate works without DATABASE_URL
    url: process.env.DATABASE_URL ?? '',
  },
});
