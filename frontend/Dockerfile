FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Where the browser reaches the API; defaults to the compose backend on localhost:3000.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
# Same API address the build baked in - the security policy only lets the page call it.
ARG VITE_API_URL=http://localhost:3000
ENV API_ORIGIN=$VITE_API_URL
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
