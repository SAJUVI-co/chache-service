import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserCacheService } from './cache.service';

@Controller()
export class UserCacheController {
  constructor(private readonly cacheService: UserCacheService) {}

  @MessagePattern('test')
  create() {
    return this.cacheService.test();
  }

  @MessagePattern('saveCache')
  async saveCache(@Payload() payload: { id: string; data: Promise<any> }) {
    const { id, data } = payload;
    const info = await this.cacheService.saveCache(id, data);
    console.log(info);
    return info;
  }

  @MessagePattern('getUserCache')
  getCache(@Payload() payload: { id: string }) {
    const { id } = payload;
    const data = this.cacheService.getCache(id);
    console.log(data);
    return data;
  }

  @MessagePattern('delUserCache')
  deleteCache(@Payload() payload: string) {
    return this.cacheService.deleteCache(payload);
  }
}
