#Had problems with pnpm and sqlite, so just using npm. bit longer but gets the job done.

#Builds the takuzu-grid-factory wasm module /play needs; not part of the node image, so it
#gets its own stage with the Rust toolchain wasm-pack needs.
FROM rust:1-slim AS wasm-builder
WORKDIR /wasm
RUN rustup target add wasm32-unknown-unknown \
    && cargo install wasm-pack
COPY takuzu-grid-factory ./takuzu-grid-factory
RUN wasm-pack build takuzu-grid-factory --target web --out-dir /wasm/pkg

FROM node:24-slim AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
COPY --from=wasm-builder /wasm/pkg ./src/lib/wasm/pkg
#Needs a place holder during build
ENV DATABASE_URL="placeholder"
RUN npm run build

FROM node:24-alpine3.22 AS web-app
WORKDIR /app

COPY --from=builder /app/build /app/dist
COPY --from=builder /app/package.json /app/
COPY ./drizzle /app/drizzle
ENV MIGRATIONS_FOLDER="/app/drizzle"

RUN npm install --prod

#This is saying run what's in the dist folder
CMD ["node", "/app/dist/index.js"]