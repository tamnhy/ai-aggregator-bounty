# Aggregator API prototype

This is a **prototype**, not a verified make.fun submission. It uses Node.js 22 and no paid dependencies.

Run: `AGGREGATOR_TOKEN=local-secret MODEL_ENDPOINTS=https://your-provider.example/v1/chat/completions node main.mjs`

Send POST `/v1/chat/completions` with `Authorization: Bearer local-secret`, a JSON `model`, and `messages` array. Configure comma-separated full HTTPS provider URLs using `MODEL_ENDPOINTS`; optionally configure `UPSTREAM_API_KEY`. The aggregator attempts the next endpoint on 429 or 5xx. Health endpoint: `GET /health`.

Security: Keep API keys in environment variables, never commit them. Provider URLs must be trusted; the server is not intended to expose arbitrary URL proxying. The models listing is a placeholder until provider discovery is implemented. Streaming is not implemented. No real model calls or make.fun submission have been verified.
