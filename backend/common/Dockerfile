FROM docker.io/library/node:24-alpine AS common

WORKDIR /app/common
COPY backend/common/package.json backend/common/package-lock.json ./
RUN npm ci
COPY backend/common/tsconfig.json ./
COPY backend/common/src ./src
RUN npm run build

FROM docker.io/library/node:24-alpine AS service

ARG SERVICE
ENV NODE_ENV=production
WORKDIR /app/common
COPY --from=common /app/common/package.json /app/common/package-lock.json ./
COPY --from=common /app/common/build ./build
RUN npm ci --omit=dev

WORKDIR /app/${SERVICE}
COPY backend/${SERVICE}/package.json backend/${SERVICE}/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/${SERVICE}/tsconfig.json ./
COPY backend/${SERVICE}/src ./src

USER node
CMD ["npm", "start"]