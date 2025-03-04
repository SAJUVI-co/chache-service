import { Module } from '@nestjs/common';
import { UserCacheModule } from './cache/cache.module';

@Module({
  imports: [UserCacheModule],
})
export class AppModule {}
