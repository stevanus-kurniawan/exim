# Exim Operation System - Backend
# Production-oriented; suitable for local development when used with docker-compose.
# When a build step is added (e.g. TypeScript), add a multi-stage build that produces dist/.

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3003
EXPOSE 3003

# Run migrations, then seed admin if SEED_ADMIN_EMAIL/PASSWORD set, then start
CMD ["sh", "-c", "npm run migrate:prod && (test -n \"$SEED_ADMIN_EMAIL\" && test -n \"$SEED_ADMIN_PASSWORD\" && npm run seed:prod || true) && npm run start"]
