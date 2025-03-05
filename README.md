# Servicio `users_cache`

## Introducción

El servicio `users_cache` es un microservicio desarrollado con [NestJS](https://nestjs.com/) que se encarga de almacenar temporalmente los datos de los usuarios en una caché utilizando **Redis**. Está diseñado para mejorar el rendimiento de las aplicaciones reduciendo las consultas directas a bases de datos persistentes.

Este servicio está **dockerizado** y se comunica mediante un transporte **TCP**, lo que lo hace compatible con arquitecturas basadas en microservicios.

---  

## Indice  
- [Tecnologías utilizadas](#tecnologías-utilizadas)  
- [Arquitectura del servicio](#arquitectura-del-servicio)  
- [Configuración de Entorno](#configuración-de-entorno)  
  - [Variables requeridas](#variables-requeridas)  
- [Implementación](#implementación)  
  - [Bootstrap de la aplicación (main.ts)](#Bootstrap-de-la-aplicación-(`main.ts`))  
  - [Módulo Principal (app.module.ts)](#módulo-principal-appmodulets)  
  - [Servicio de Caché (cache.service.ts)](#servicio-de-caché-cacheservicets)  
    - [Métodos principales](#métodos-principales)  
  - [Controlador de Caché (cache.controller.ts)](#controlador-de-caché-cachecontrollerts)  
- [Dockerización del servicio](#dockerización-del-servicio)  
  - [Dockerfile](#dockerfile)  
  - [Docker Compose (docker-compose.yml)](#docker-compose-docker-composeyml)  
- [Cómo Ejecutar el Servicio](#cómo-ejecutar-el-servicio)  
  - [Ejecutar con Docker Compose](#ejecutar-con-docker-compose)  
  - [Verificar los contenedores](#verificar-los-contenedores)  
  - [Probar el servicio](#probar-el-servicio)  
- [Conclusión](#conclusión)  

---

## Tecnologías utilizadas

- **NestJS**: Framework para construir aplicaciones escalables en Node.js.
- **Redis**: Base de datos en memoria utilizada para el almacenamiento en caché.
- **Docker**: Para contenerizar la aplicación y Redis.
- **PNPM**: Administrador de paquetes utilizado para la instalación de dependencias.

---

## Arquitectura del servicio

El servicio se estructura en los siguientes módulos principales:

1. **Módulo Principal (`AppModule`)**: Punto de entrada de la aplicación.
2. **Módulo de Caché (`UserCacheModule`)**: Maneja las operaciones de almacenamiento, recuperación y eliminación en Redis.
3. **Controlador (`UserCacheController`)**: Expone métodos para interactuar con la caché mediante patrones de mensajes.
4. **Servicio (`UserCacheService`)**: Implementa la lógica de negocio para gestionar la caché.

---

## Configuración de Entorno

Las variables de entorno necesarias para ejecutar el servicio están definidas en `envs.config.ts` y se validan con `joi` para asegurar que contengan los valores esperados.

### Variables requeridas:

| Variable       | Descripción                         | Tipo   |
|---------------|-------------------------------------|--------|
| `REDIS_HOST`  | Dirección del servidor Redis       | String |
| `REDIS_PORT`  | Puerto de Redis                    | Number |
| `SERVER_HOST` | Dirección del microservicio       | String |
| `SERVER_PORT` | Puerto del microservicio          | Number |

Si alguna variable de entorno está ausente o mal configurada, la aplicación lanzará un error durante la inicialización.

---

## Implementación

### 1. Bootstrap de la aplicación (`main.ts`)

Este archivo configura el servicio como un **microservicio TCP** en NestJS, utilizando las variables de entorno para definir la dirección y el puerto.

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

### 2. Módulo Principal (`app.module.ts`)

Este módulo importa el módulo de caché y define la estructura del servicio.

```typescript
@Module({
  imports: [UserCacheModule],
})
export class AppModule {}
```

---

### 3. Servicio de Caché (`cache.service.ts`)

Este servicio implementa las funciones de almacenamiento, recuperación y eliminación de datos en Redis.

#### Métodos principales:

- `saveCache(id: string, data: any)`: Guarda un objeto en la caché con una expiración de 1 hora.
- `getCache(id: string)`: Obtiene un objeto de la caché basado en su `id`.
- `deleteCache(id: string)`: Elimina un objeto de la caché.

```typescript
@Injectable()
export class UserCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  private h: number = 60 * 60 * 1000; // 1 hora en milisegundos

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

### 4. Controlador de Caché (`cache.controller.ts`)

Expone métodos que permiten interactuar con la caché a través de mensajes.

| Método        | Descripción |
|--------------|------------|
| `test()` | Método de prueba para verificar la conectividad. |
| `saveCache({ id, data })` | Guarda datos en la caché. |
| `getCache({ id })` | Recupera datos de la caché. |
| `deleteCache(id)` | Elimina un dato de la caché. |

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

## Dockerización del servicio

### 1. Dockerfile

Este archivo define la imagen de Docker del servicio.

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

Este archivo define cómo se ejecutan los contenedores de la aplicación y Redis.

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

## Cómo Ejecutar el Servicio

### 1. Ejecutar con Docker Compose
```sh
docker-compose up -d
```

### 2. Verificar los contenedores
```sh
docker ps
```

### 3. Probar el servicio
Desde otro servicio o cliente compatible con microservicios TCP en NestJS, se pueden enviar mensajes como:

```typescript
client.send('saveCache', { id: '123', data: { name: 'Juan' } });
client.send('getUserCache', { id: '123' });
client.send('delUserCache', '123');
```

---

## Conclusión

El servicio `users_cache` es una solución eficiente para el almacenamiento temporal de datos de usuario utilizando **Redis**. Su implementación con **NestJS** permite una arquitectura modular y escalable, mientras que **Docker** facilita su despliegue en entornos distribuidos.
