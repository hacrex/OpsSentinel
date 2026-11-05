FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_GITHUB_CLIENT_ID
ENV VITE_GITHUB_CLIENT_ID=$VITE_GITHUB_CLIENT_ID
RUN npm run build

FROM nginx:alpine
RUN apk add --no-cache openssl gettext

COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY generate-selfsigned.sh /usr/local/bin/generate-selfsigned.sh
RUN chmod +x /usr/local/bin/generate-selfsigned.sh

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443
CMD ["sh", "-c", "generate-selfsigned.sh && envsubst < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
