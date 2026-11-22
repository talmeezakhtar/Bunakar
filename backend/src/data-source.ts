import 'dotenv/config';
import { DataSource } from 'typeorm';

/** Used only by the TypeORM CLI (`npm run migration:*`). The app builds its own connection in
 * app.module.ts from the same entities and migrations. */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [`${__dirname}/**/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
});
