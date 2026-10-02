import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SwatchesModule } from './swatches/swatches.module';
import { TileDesignsModule } from './tile-designs/tile-designs.module';
import { FreeformDesignsModule } from './freeform-designs/freeform-designs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // Creates/updates tables from the entities. On by default outside production; in
        // production it must be switched on explicitly (DB_SYNCHRONIZE=true) - without it and
        // with no migrations, a fresh database has no tables and the app fails on boot.
        // ponytail: schema sync instead of migrations - add TypeORM migrations before real data
        // lives in production, since sync can drop columns when an entity changes.
        synchronize:
          config.get<string>('NODE_ENV') !== 'production' ||
          config.get<string>('DB_SYNCHRONIZE') === 'true',
      }),
    }),
    AuthModule,
    SwatchesModule,
    TileDesignsModule,
    FreeformDesignsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
