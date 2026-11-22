# Image kecil, multi-arch (jalan di STB arm64 maupun laptop amd64)
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Data JSON disimpan di volume /data
RUN mkdir -p /data && chown -R node:node /data /app
USER node
ENV DATA_FILE=/data/db.json PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/server.js"]
