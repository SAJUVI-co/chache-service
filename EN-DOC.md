# **Documentation of `users_cache` Service**

## **Introduction**

The `users_cache` service is a microservice built with [NestJS](https://nestjs.com/) that temporarily stores user data in a **Redis** cache. It is designed to improve application performance by reducing direct queries to persistent databases.

This service is **containerized with Docker** and communicates using **TCP transport**, making it compatible with microservices architectures.

[*Ver documentación en español*](./EN-DOC.md)

---

## Index
- [Technologies Used](#Technologies-Used)
- [Service Architecture](#Service-Architecture)
- [Environment Configuration](#Environment-Configuration)
  - [Required Variables:](#Required-Variables:) 
- [Implementation](#Implementation)
  - [1. Application Bootstrap (`main.ts`)](#1.-Application-Bootstrap-(`main.ts`))
  - [2. Main Module (`app.module.ts`)](#2.-Main-Module-(`app.module.ts`))
  - [3. Cache Service (`cache.service.ts`)](#3.-Cache-Service-(`cache.service.ts`))
    - [Main Methods:](#Main-Methods:)
  - [4. Cache Controller (`cache.controller.ts`)](#4.-Cache-Controller-(`cache.controller.ts`))
- [Service Containerization](#Service-Containerization)
  - [1. Dockerfile](#1.-Dockerfile)
  - [2. Docker Compose (`docker-compose.yml`)](#2.-Docker-Compose-(`docker-compose.yml`))
- [How to Run the Service](#How-to-Run-the-Service)
  - [1. Run with Docker Compose](#1.-Run-with-Docker-Compose)
  - [2. Check running containers](#2.-Check-running-containers)
  - [3. Test the service](#3.-Test-the-service)
- [Conclusion](#Conclusion)
---

## Technologies Used

- **NestJS**: A framework for building scalable applications in Node.js.
- **Redis**: An in-memory database used for caching.
- **Docker**: Used to containerize the application and Redis.
- **PNPM**: A package manager used for dependency installation.

---

## Service Architecture

The service is structured into the following main modules:

1. **Main Module (`AppModule`)**: The application's entry point.
2. **Cache Module (`UserCacheModule`)**: Handles storage, retrieval, and deletion operations in Redis.
3. **Controller (`UserCacheController`)**: Exposes methods to interact with the cache using message patterns.
4. **Service (`UserCacheService`)**: Implements the business logic for cache management.

---

## Environment Configuration

The required environment variables for running the service are defined in `envs.config.ts` and validated using `joi` to ensure they contain the expected values.

### Required Variables:

| Variable      | Description                  | Type   |
|--------------|------------------------------|--------|
| `REDIS_HOST` | Redis server address         | String |
| `REDIS_PORT` | Redis server port            | Number |
| `SERVER_HOST` | Microservice address        | String |
| `SERVER_PORT` | Microservice port           | Number |

If any environment variable is missing or misconfigured, the application will throw an error during initialization.

---

## Implementation

### 1. Application Bootstrap (`main.ts`)

This file configures the service as a **TCP microservice** in NestJS, using environment variables to define the host and port.

```typescript
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: SERVER_HOST,
        port: SERVER_PORT,
      },
    },
  );

  await app.listen();

  const logger = new Logger('Users cache');
  logger.log('Service Running');
}
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Error during bootstrap', error);
});
```
---

### 2. Main Module (`app.module.ts`)

This module imports the cache module and defines the service structure.

```typescript
@Module({
  imports: [UserCacheModule],
})
export class AppModule {}
```

---

### 3. Cache Service (`cache.service.ts`)

This service implements the functions for storing, retrieving, and deleting data in Redis.

#### Main Methods:

- `saveCache(id: string, data: any)`: Saves an object in the cache with a 1-hour expiration.
- `getCache(id: string)`: Retrieves an object from the cache based on its `id`.
- `deleteCache(id: string)`: Deletes an object from the cache.

```typescript
@Injectable()
export class UserCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  private h: number = 60 * 60 * 1000; // 1 hour in milliseconds

  async saveCache(id: string, data: any): Promise<void> {
    try {
      return await this.cacheManager.set(id, data, this.h);
    } catch (error) {
      throw new RpcException({
        message: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 400,
      });
    }
  }

  async getCache(id: string) {
    try {
      return await this.cacheManager.get(id);
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
```

---

### 4. Cache Controller (`cache.controller.ts`)

Exposes methods to interact with the cache through message patterns.

| Method        | Description |
|--------------|------------|
| `test()` | Test method to check connectivity. |
| `saveCache({ id, data })` | Saves data in the cache. |
| `getCache({ id })` | Retrieves data from the cache. |
| `deleteCache(id)` | Deletes data from the cache. |

```typescript
@Controller()
export class UserCacheController {
  constructor(private readonly cacheService: UserCacheService) {}

  @MessagePattern('test')
  create() {
    return this.cacheService.test();
  }

  @MessagePattern('saveCache')
  async saveCache(@Payload() payload: { id: string; data: Promise<any> }) {
    return await this.cacheService.saveCache(payload.id, payload.data);
  }

  @MessagePattern('getUserCache')
  getCache(@Payload() payload: { id: string }) {
    return this.cacheService.getCache(payload.id);
  }

  @MessagePattern('delUserCache')
  deleteCache(@Payload() payload: string) {
    return this.cacheService.deleteCache(payload);
  }
}
```

---

## Service Containerization

### 1. Dockerfile

This file defines the Docker image for the service.

```dockerfile
FROM node:22.13

WORKDIR /home/cache

COPY . /home/cache/

RUN npm install -g pnpm
RUN pnpm install
RUN pnpm build

EXPOSE 5001

CMD ["pnpm", "start:prod"]
```

---

### 2. Docker Compose (`docker-compose.yml`)

This file defines how the application and Redis containers run.

```yaml
services:
  users_cache:
    container_name: users_cache
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - '${SERVER_PORT}:5001'
    networks:
      - service_network
    depends_on:
      - redis_DB

  redis_DB:
    image: redis:latest
    restart: always
    command: redis-server --save 20 1 --loglevel warning
    volumes:
      - redis_data:/data
    ports:
      - '${REDIS_PORT}:6379'
    networks:
      - service_network

volumes:
  redis_data:

networks:
  service_network:
    external: true
```

---

## How to Run the Service

### 1. Run with Docker Compose
```sh
docker-compose up -d
```

### 2. Check running containers
```sh
docker ps
```

### 3. Test the service
From another service or a client compatible with NestJS TCP microservices, you can send messages like:

```typescript
client.send('saveCache', { id: '123', data: { name: 'John' } });
client.send('getUserCache', { id: '123' });
client.send('delUserCache', '123');
```

---

## Conclusion

The `users_cache` service is an efficient solution for temporary user data storage using **Redis**. Its implementation with **NestJS** allows for a modular and scalable architecture, while **Docker** simplifies deployment in distributed environments.
