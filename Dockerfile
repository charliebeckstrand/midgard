# One image recipe for each Next app in `apps/`. The App Platform specs in
# `.do/` set `APP` to the name of the app. Build one app locally with:
#
#   docker build --build-arg APP=admin --build-arg BIFROST_URL=https://auth.ivoryimage.dev .
#
# `turbo prune` writes a copy of the workspace that holds only the app and the
# packages that it uses. The install layer copies only the manifests of that
# copy, so a source change does not start a new install.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base
# Keep the same version as the `packageManager` field of the root `package.json`.
RUN npm install --global pnpm@12.5.1
WORKDIR /app

FROM base AS prune
ARG APP
COPY . .
# Keep the same version as the `turbo` dependency of the root `package.json`.
RUN pnpm dlx turbo@2.11.2 prune ${APP} --docker

FROM base AS build
ARG APP
# `next build` writes the gateway origin into the rewrites, so the build needs it.
# App Platform sends each build-time variable of the spec as a build argument.
ARG BIFROST_URL
ENV BIFROST_URL=${BIFROST_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=prune /app/out/json/ ./
# The only install script in the tree is the `prepare` of the root, which
# installs git hooks. The image has no git repository, so skip the scripts.
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=prune /app/out/full/ ./
# `turbo prune` copies the workspaces, not the shared configs at the root.
COPY tsconfig.base.json tsconfig.nextjs.json postcss.config.mjs .browserslistrc ./
RUN pnpm turbo run build --filter=${APP}
# An app without a `public/` directory gets an empty one, for the copy below.
RUN mkdir -p apps/${APP}/public

FROM node:${NODE_VERSION}-alpine AS run
ARG APP
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# The standalone output keeps the workspace layout, so `server.js` is at
# `apps/<app>/server.js`. It does not hold `public/` or `.next/static`, so copy
# those beside it.
COPY --from=build --chown=node:node /app/apps/${APP}/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=build --chown=node:node /app/apps/${APP}/public ./apps/${APP}/public
USER node
WORKDIR /app/apps/${APP}
EXPOSE 3000
CMD ["node", "server.js"]
