import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Cache } from 'cache-manager';

@Injectable()
export class UserCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  test() {
    return 'hola';
  }

  async saveCache(id: string, data: any) {
    try {
      await this.cacheManager.set(id, data, 3600);
      return 'user saved in cache';
    } catch (error) {
      throw new RpcException({
        message: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 400,
      });
    }
  }

  async getCache(id: string) {
    try {
      const user = await this.cacheManager.get(id);
      console.log(user);
      return user;
    } catch (error) {
      throw new RpcException({
        message: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 400,
      });
    }
  }

  async deleteCache(id: string) {
    try {
      return await this.cacheManager.del(id);
    } catch (error) {
      throw new RpcException({
        message: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 400,
      });
    }
  }
}
