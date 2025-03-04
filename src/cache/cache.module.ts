import { Module } from '@nestjs/common';
import { UserCacheService } from './cache.service';
import { UserCacheController } from './cache.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: 'localhost',
            port: 6379,
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
