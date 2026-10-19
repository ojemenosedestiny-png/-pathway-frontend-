FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
# This web server uses no SQLite/native database module or dependency install hooks.
RUN npm ci --ignore-scripts
COPY journey ./journey
COPY server.js ./server.js
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/journey/dist ./journey/dist
COPY journey/theme.css journey/workspace-tokens.css journey/workspace.css journey/live.html ./journey/
COPY assets ./assets
COPY index.html styles.css redesign.css script.js ui-enhancements.js frontend-server.cjs live-api-proxy.cjs ./
USER node
EXPOSE 3000
CMD ["node", "frontend-server.cjs"]
