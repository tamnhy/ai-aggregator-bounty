# Free AI Model Aggregator (prototype)

Node.js 22+ HTTP gateway for OpenAI-compatible upstream providers. No npm dependencies.

## Start

```bash
AGGREGATOR_TOKEN=local-secret \
MODEL_ENDPOINTS=https://provider.example/v1/chat/completions \
MODEL_NAMES=free-model \
node main.mjs
```

`UPSTREAM_API_KEY` optionally sets a common upstream Bearer token. `PORT` defaults to 3000. Configure multiple comma-separated `MODEL_ENDPOINTS` for sequential fallback.

## API

- `GET /health` (no authentication)
- `GET /v1/models` (currently public; model names come from `MODEL_NAMES`)
- `POST /v1/chat/completions` (Bearer `AGGREGATOR_TOKEN`)
- `POST /v1/messages` (Bearer `AGGREGATOR_TOKEN`; converts a basic Anthropic Messages request to OpenAI chat and converts the response back)

Streaming requests are not supported. The gateway retries the next configured endpoint for 402, 408, 429, 500, 502, 503, and 504, or for network errors. Other HTTP statuses are returned to the caller.

## Local tests

```bash
node --check main.mjs
node --check test.mjs
node test.mjs
```

Tests start two mock upstream servers and check authentication, validation, provider fallback on 429, model catalog, Anthropic response shape, and 20 chat requests. They do not validate live providers or any external bounty grader.

## Known limitations

- Providers and model names are configured manually; no automatic free-model discovery.
- All upstreams share one optional API key.
- No streaming, advanced Anthropic content/tool conversion, or per-provider model mapping.
- The gateway is not hardened for public multi-tenant production traffic.
- `main.ts` is an earlier experimental entry point; `main.mjs` is the tested entry point.
- No claim is made that this prototype satisfies the complete make.fun bounty rubric.

## Evidence

A local Node.js 22 run of `node test.mjs` passed the included mock-provider integration checks on 2026-11-15. This is a local test, not an official make.fun evaluation or submission.
