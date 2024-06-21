# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=22.3.0

FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.
ENV NODE_ENV=production


WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into
# into this layer.

# Run the application as a non-root user.
RUN mkdir /usr/src/app/node_modules \ 
		&& chmod -R 777 /usr/src/app \
		&& addgroup -S app \
		&& adduser -S app -G app \
		&& chmod -R 777 /usr/src/app
USER node

# Copy the rest of the source files into the image.
COPY ./compiled ./compiled
COPY package.json yarn.lock schema.prisma .env ./

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    --mount=type=cache,target=/root/.npm \
    yarn install --frozen-lockfile --omit=dev
RUN yarn run prisma generate --schema /usr/src/app/schema.prisma

# Expose the port that the application listens on.
EXPOSE 3000

# Run the application.
CMD yarn start
