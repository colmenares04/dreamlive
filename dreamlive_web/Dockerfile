# Stage 1: Build the React app
FROM node:20-alpine as build-stage

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar código y build
COPY . .
# Nota: VITE_API_URL debe ser configurada en el .env de docker-compose
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:stable-alpine as production-stage

# Copiar archivos estáticos desde el build
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx para SPA (manejo de rutas)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
