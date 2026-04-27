FROM node:18-alpine
WORKDIR /app
COPY artifacts/api-server/package*.json ./
RUN npm install
COPY artifacts/api-server/src ./src
COPY artifacts/api-server/tsconfig.json ./
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
