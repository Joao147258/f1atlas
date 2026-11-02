import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Sanitização e tratamento de variável ausente em tempo de geração e validação estática
const databaseUrl = process.env.DATABASE_URL || 'mysql://localhost:3306/f1atlas_dev';

export default defineConfig({
  schema: 'apps/api/prisma/schema.prisma',
  migrations: {
    path: 'apps/api/prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
