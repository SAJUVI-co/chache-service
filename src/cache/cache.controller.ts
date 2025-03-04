import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UserCacheService } from './cache.service';

@Controller()
export class UserCacheController {
  constructor(private readonly cacheService: UserCacheService) {}

  @MessagePattern('test')
  create() {
    return this.cacheService.test();
  }

  @MessagePattern('saveCache')
  saveCache(id: string, data: any) {
    return this.cacheService.saveCache(id, data);
  }

  @MessagePattern('getUserCache')
  getCache(id: string) {
    return this.cacheService.getCache(id.toString());
  }

  @MessagePattern('delUserCache')
  deleteCache(id: string) {
    return this.cacheService.deleteCache(id.toString());
  }
}
