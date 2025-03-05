FROM node:22.13

WORKDIR /home/cache

COPY . /home/cache/

RUN npm install -g pnpm

RUN pnpm install

RUN pnpm build

EXPOSE 5001

CMD ["pnpm", "start:prod"]