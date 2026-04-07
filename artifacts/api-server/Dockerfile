FROM node:18-alpine
WORKDIR /app
COPY artifacts/api-server/dist/ ./dist/
COPY artifacts/api-server/package.json ./dist/package.json
EXPOSE 3000
CMD ["node", "dist/index.js"]