# LifeScore — single-instance container with a persistent volume for SQLite.
#
# The database is a file. Mount a volume at /data and point DATABASE_PATH at it,
# or every deploy starts from an empty database. See DEPLOY.md.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV DATABASE_PATH=/data/lifescore.db

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# The standalone output carries only what the server actually needs.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# The volume mount point, owned by the app user so it can create the database.
RUN mkdir -p /data && chown nextjs:nodejs /data
VOLUME /data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
