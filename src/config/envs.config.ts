import 'dotenv/config';
import * as joi from 'joi';

interface Envs {
  REDIS_HOST: string;
  REDIS_PORT: number;
  SERVER_HOST: string;
  SERVER_PORT: number;
}

const schema = joi
  .object({
    REDIS_HOST: joi.string().required(),
    REDIS_PORT: joi.number().required(),
    SERVER_HOST: joi.string().required(),
    SERVER_PORT: joi.number().required(),
  })
  .unknown(true);

const data = schema.validate(process.env);

if (data.error) {
  throw new Error(`Config validation error: ${data.error.message}`);
}

export const { REDIS_HOST, REDIS_PORT, SERVER_HOST, SERVER_PORT } =
  data.value as Envs;
