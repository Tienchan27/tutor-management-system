FROM node:20-alpine AS frontend-build
WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

ARG REACT_APP_API_URL=/api
ARG REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_GOOGLE_CLIENT_ID=${REACT_APP_GOOGLE_CLIENT_ID}

RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-build /frontend/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
