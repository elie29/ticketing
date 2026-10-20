FROM docker.io/library/node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

CMD ["npm", "run", "dev"]