# ---- base image ----
  FROM node:20-bookworm-slim AS base
  WORKDIR /app
  # NOTE: do NOT set NODE_ENV here; we need devDeps during build.
  
  # ---- deps layer (installs deps + devDeps; cache-friendly) ----
  FROM base AS deps
  COPY package.json package-lock.json* ./
  RUN --mount=type=cache,target=/root/.npm \
      npm ci                # installs devDependencies too (since NODE_ENV not=production)
  
  # ---- build layer ----
  FROM base AS build
  COPY --from=deps /app/node_modules /app/node_modules
  COPY . .
  RUN npm run build        # vite build -> adapter-node outputs ./build
  
  # ---- runtime image (production) ----
  FROM node:20-bookworm-slim AS runtime
  ENV NODE_ENV=production \
      PORT=3000
  WORKDIR /app
  
  # Only copy the built server output
  COPY --from=build /app/build /app/build
  # If you serve any extra static files outside build/, copy them too (usually not needed):
  # COPY --from=build /app/static /app/static
  
  # Drop privileges
  USER node
  
  EXPOSE 3000
  HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD node -e "require('http').request({host:'127.0.0.1',port:process.env.PORT||3000,path:'/'},r=>process.exit(r.statusCode>=200&&r.statusCode<500?0:1)).on('error',()=>process.exit(1)).end()"
  
  # adapter-node writes a package.json into /app/build, so this works:
  CMD ["node", "build"]
  