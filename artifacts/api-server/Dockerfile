FROM node:18-alpine
ARG CACHEBUST
WORKDIR /app/artifacts/api-server
COPY artifacts/api-server/package.json ./
COPY artifacts/api-server/dist/ ./dist/
RUN npm install --omit=dev --ignore-scripts
EXPOSE 3000
CMD ["node", "dist/index.js"]
