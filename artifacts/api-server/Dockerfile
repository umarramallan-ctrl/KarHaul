FROM node:18-alpine
WORKDIR /app

# Install pnpm (required for workspace dependency resolution)
RUN npm install -g pnpm

# Copy the full monorepo so workspace packages (lib/*) resolve correctly
COPY . .

# Install all workspace dependencies from the monorepo root
RUN pnpm install --frozen-lockfile

# Build the api-server — esbuild bundles all workspace packages into dist/index.js
RUN node ./artifacts/api-server/build.mjs

EXPOSE 3000
CMD ["node", "artifacts/api-server/dist/index.js"]
