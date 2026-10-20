FROM docker.io/library/node:24-alpine AS common

WORKDIR /app/common
COPY common/package.json common/package-lock.json ./
RUN npm ci
COPY common/tsconfig.json ./
COPY common/src ./src
RUN npm run build

FROM docker.io/library/node:24-alpine AS service

ARG SERVICE
WORKDIR /app/common
COPY --from=common /app/common/package.json /app/common/package-lock.json ./
COPY --from=common /app/common/build ./build
RUN npm ci --omit=dev

WORKDIR /app/${SERVICE}
COPY ${SERVICE}/package.json ${SERVICE}/package-lock.json ./
RUN npm ci --omit=dev
COPY ${SERVICE}/tsconfig.json ./
COPY ${SERVICE}/src ./src

CMD ["npm", "start"]