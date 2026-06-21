# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Serve stage ---
FROM nginx:alpine
# curl is not in nginx:alpine; Coolify's health gate runs a curl GET / inside
# the container expecting 200, so without curl the probe can't execute and the
# deploy waits until timeout. Install it so the check can actually run.
RUN apk add --no-cache curl
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
