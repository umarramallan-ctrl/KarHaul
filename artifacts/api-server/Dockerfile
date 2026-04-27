FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY artifacts/api-server ./artifacts/api-server
RUN pnpm install --filter api-server --frozen-lockfile
WORKDIR /app/artifacts/api-server
RUN pnpm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
