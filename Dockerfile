#Had problems with pnpm and sqlite, so just using npm. bit longer but gets the job done.

FROM node:24-slim AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
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