import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SwatchesModule } from './swatches/swatches.module';
import { TileDesignsModule } from './tile-designs/tile-designs.module';
import { FreeformDesignsModule } from './freeform-designs/freeform-designs.module';
import { DesignQuotaModule } from './common/designs/design-quota.module';
import { InboxModule } from './inbox/inbox.module';
import { RugDesignsModule } from './rug-designs/rug-designs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const test = config.get<string>('NODE_ENV') === 'test';
        return {
          type: 'postgres',
          url: config.get<string>('DATABASE_URL'),
          autoLoadEntities: true,
          // The schema comes from migrations (src/migrations), run on every boot, so a fresh
          // database gets every table and an existing one gets what it is missing. Schema sync
          // is only for tests, which build a throwaway schema straight from the entities.
          migrations: [`${__dirname}/migrations/*{.ts,.js}`],
          migrationsRun: !test,
          synchronize: test,
        };
      },
    }),
    DesignQuotaModule,
    AuthModule,
    SwatchesModule,
    TileDesignsModule,
    FreeformDesignsModule,
    InboxModule,
    RugDesignsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
