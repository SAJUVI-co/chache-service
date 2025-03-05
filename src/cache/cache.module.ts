import { Module } from '@nestjs/common';
import { UserCacheService } from './cache.service';
import { UserCacheController } from './cache.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { REDIS_HOST, REDIS_PORT } from 'src/config/envs.config';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: REDIS_HOST,
            port: REDIS_PORT,
          },
        }),
      }),
    }),
  ],
  controllers: [UserCacheController],
  providers: [UserCacheService],
  exports: [UserCacheService, CacheModule], // Exportamos ambos
})
export class UserCacheModule {}
