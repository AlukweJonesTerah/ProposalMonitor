# Production image for Render: dashboard, monitor, and alert scheduler share
# the persistent proposal_output disk consumed by the dashboard.
FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package.json ./
RUN npm install

FROM node:22-bookworm-slim AS builder
WORKDIR /app

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=10000 \
    HOSTNAME=0.0.0.0 \
    PYTHONUNBUFFERED=1 \
    PROPOSAL_SOURCE_CONFIG=/app/proposal_output/proposal_source.json \
    PATH=/opt/venv/bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/venv

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/Migrations ./Migrations
COPY --from=builder /app/proposal_output ./proposal_output
COPY --from=builder /app/proposal_monitor_runtime.py /app/proposal_hybrid_monitor.py /app/proposal_research_agent.py /app/proposal_scheduler.py /app/mygov_alert_scheduler.py ./
COPY --from=builder /app/start-render.sh ./start-render.sh

RUN chmod +x ./start-render.sh \
    && mkdir -p ./proposal_output \
    && chown -R node:node /app

# start-render.sh sets ownership on Render's runtime-mounted disk and then
# re-executes itself as the unprivileged node user.
USER root
EXPOSE 10000
CMD ["./start-render.sh"]
