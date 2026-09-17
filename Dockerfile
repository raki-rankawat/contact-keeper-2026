# syntax=docker/dockerfile:1

# Node 24 to match "engines" in package.json. Debian slim rather than Alpine so
# Vite/Rollup get their glibc native binary instead of the musl one.
FROM node:24-slim AS base
WORKDIR /app


# ---------------------------------------------------------------------------
# dev — one image for both the API and the Vite dev server. compose bind-mounts
# the source over /app, so the COPY here only seeds the image; the npm installs
# are what matter, and anonymous volumes keep them from being shadowed.
# ---------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci

COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix client

COPY . .

EXPOSE 5000 5173
CMD ["npx", "nodemon", "-L", "server.js"]


# ---------------------------------------------------------------------------
# client-build — produces client/dist for the prod stage
# ---------------------------------------------------------------------------
FROM base AS client-build
ENV NODE_ENV=development
WORKDIR /app/client

COPY client/package.json client/package-lock.json ./
RUN npm ci --include=dev

COPY client/ ./
RUN npm run build


# ---------------------------------------------------------------------------
# prod — a single container: Express serves the API and the built client.
# server.js only mounts the static handler when NODE_ENV=production.
# ---------------------------------------------------------------------------
FROM base AS prod
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY config ./config
COPY controllers ./controllers
COPY middleware ./middleware
COPY models ./models
COPY routes ./routes
COPY utils ./utils
COPY server.js ./
COPY --from=client-build /app/client/dist ./client/dist

USER node
EXPOSE 5000

# No /health route yet — the root path answers on both sides of the NODE_ENV
# branch in server.js, so a non-5xx there means the process is serving.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
