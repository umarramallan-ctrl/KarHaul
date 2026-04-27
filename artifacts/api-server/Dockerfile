FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY artifacts/api-server ./artifacts/api-server
COPY lib/db ./lib/db
COPY lib/api-zod ./lib/api-zod
RUN pnpm install --frozen-lockfile
WORKDIR /app/artifacts/api-server
RUN pnpm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
