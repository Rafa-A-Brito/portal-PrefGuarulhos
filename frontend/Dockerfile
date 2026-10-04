# ===== Stage 1: build =====
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Baked em build-time pelo Vite — em runtime não dá pra trocar (é client-side).
# "/api" funciona porque o nginx desta mesma imagem faz proxy de /api/ para
# o container do backend (ver nginx.conf) — sem isso o browser não saberia
# resolver o hostname interno "backend" do Docker.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ===== Stage 2: runtime (nginx servindo os arquivos estáticos) =====
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
