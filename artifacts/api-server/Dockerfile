FROM node:18-alpine
ARG CACHEBUST
WORKDIR /app

# Copy the api-server package
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY artifacts/api-server/dist/ ./artifacts/api-server/dist/

# Copy local workspace dependencies
COPY lib/api-zod ./lib/api-zod
COPY lib/db ./lib/db

# Install production deps (no workspace packages, no scripts)
RUN cd artifacts/api-server && npm install --omit=dev --ignore-scripts

WORKDIR /app/artifacts/api-server

EXPOSE 3000

CMD ["node", "dist/index.js"]
