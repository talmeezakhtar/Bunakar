import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DesignsModule } from './designs/designs.module';
import { PatternsModule } from './patterns/patterns.module';
import { ColorsModule } from './colors/colors.module';
import { MaterialsModule } from './materials/materials.module';
import { AuthModule } from './auth/auth.module';
import { SwatchesModule } from './swatches/swatches.module';
import { TileDesignsModule } from './tile-designs/tile-designs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    DesignsModule,
    PatternsModule,
    ColorsModule,
    MaterialsModule,
    AuthModule,
    SwatchesModule,
    TileDesignsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
