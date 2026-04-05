FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files from repo root (needed to resolve catalog: protocol)
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy the api-server package
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY artifacts/api-server/dist/ ./artifacts/api-server/dist/

# Install production deps using pnpm
RUN pnpm install --no-frozen-lockfile --prod

WORKDIR /app/artifacts/api-server

EXPOSE 3000

CMD ["node", "dist/index.js"]
