# Etapa 1: Dependências
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --no-frozen-lockfile

# Etapa 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p public

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Dados públicos da franquia são embutidos no bundle em tempo de build
ARG NEXT_PUBLIC_FRANQUIA_WHATSAPP
ARG NEXT_PUBLIC_FRANQUIA_NOME
ARG NEXT_PUBLIC_FRANQUIA_EMAIL
ARG NEXT_PUBLIC_FRANQUIA_HORARIO
ARG NEXT_PUBLIC_FRANQUIA_CNPJ
ENV NEXT_PUBLIC_FRANQUIA_WHATSAPP=$NEXT_PUBLIC_FRANQUIA_WHATSAPP \
    NEXT_PUBLIC_FRANQUIA_NOME=$NEXT_PUBLIC_FRANQUIA_NOME \
    NEXT_PUBLIC_FRANQUIA_EMAIL=$NEXT_PUBLIC_FRANQUIA_EMAIL \
    NEXT_PUBLIC_FRANQUIA_HORARIO=$NEXT_PUBLIC_FRANQUIA_HORARIO \
    NEXT_PUBLIC_FRANQUIA_CNPJ=$NEXT_PUBLIC_FRANQUIA_CNPJ

RUN pnpm build

# Etapa 3: Runner de Produção
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# pdftotext: lê o texto dos PDFs digitais (CRLV-e, CNH digital, contas) sem IA (src/lib/pdf-texto.ts)
RUN apk add --no-cache poppler-utils

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Diretório de cadastros (monte um volume persistente do Coolify em /app/data)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
