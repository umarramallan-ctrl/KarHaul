FROM node:18-alpine
WORKDIR /app
COPY artifacts/api-server/dist/ ./dist/
RUN mv ./dist/index.js ./dist/index.mjs
EXPOSE 3000
CMD ["node", "dist/index.mjs"]
