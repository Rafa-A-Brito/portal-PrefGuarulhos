# PROPOSTA (não testada). Vai em backend/Dockerfile.
FROM node:24-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
# Instala também as devDependencies: o CLI do Prisma está nelas e o "migrate deploy" precisa dele.
RUN npm ci
COPY . .
RUN DATABASE_URL="postgresql://u:p@localhost:5432/x" npx prisma generate
RUN mkdir -p /app/uploads
EXPOSE 3333
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
