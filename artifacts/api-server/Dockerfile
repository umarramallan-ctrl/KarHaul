FROM node:18-alpine
WORKDIR /app
COPY artifacts/api-server/dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
