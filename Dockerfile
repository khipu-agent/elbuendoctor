# ElBuenDoctor — Next.js standalone (ver DECISIONES.md #8)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Datos del seed para el modo demostración (cuando no hay Supabase configurado)
COPY data ./data
EXPOSE 3000
CMD ["node", "server.js"]
