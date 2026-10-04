# API image. Build context: repository root (the API shares rule code from src/lib and src/data).
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci --omit=dev && npm cache clean --force
COPY server/ server/
COPY src/lib/rules.ts src/lib/rules.ts
COPY src/data/ src/data/
RUN rm -f server/.env
USER node
WORKDIR /app/server
EXPOSE 4000
# Apply pending migrations, then start.
CMD ["sh", "-c", "npx tsx src/db/migrate.ts && npx tsx src/index.ts"]
