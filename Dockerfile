FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build
WORKDIR /site
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ARG FIREBASE_CONFIG_DIGEST
RUN --mount=type=secret,id=firebase-web,target=/site/.env.production.local \
    if [ -n "$FIREBASE_CONFIG_DIGEST" ]; then \
      printf '%s  %s\n' "$FIREBASE_CONFIG_DIGEST" .env.production.local | sha256sum -c -; \
    else \
      test ! -e .env.production.local; \
    fi && npm run build

FROM nginxinc/nginx-unprivileged:1.30-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03
COPY deploy/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site/dist/ /usr/share/nginx/html/
EXPOSE 8080
