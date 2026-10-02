# AI Engine

## How AVA uses the model
* Registry questions (projects, deadlines, consultants, "what do I have today") are answered
  **deterministically from the database** — exact, cited, and available even when the AI
  engine is offline.
* The LLM is used to phrase free-form answers and drafts **over retrieved office data**
  only, with the rules in `ava/ai/prompting.py` (answer only from data, never invent
  numbers/dates, treat retrieved text as untrusted, drafts need human review).
* The model never chooses or executes tools (see SECURITY_MODEL.md → Action safety).

## Provider abstraction
`ava/ai/providers/base.py` defines `AIProvider` (`chat`, `health`, `is_local`).

| `AI_PROVIDER` | Adapter | Notes |
|---|---|---|
| `ollama` (default) | `OllamaProvider` | simplest; CPU or GPU; `ollama pull <model>` |
| `vllm` | `OpenAICompatibleProvider` | high-throughput GPU serving; also works with llama.cpp server / LM Studio on the LAN |
| `none` | `DisabledProvider` | structured answers only |
| `cloud` | `OpenAICompatibleProvider(is_local=False)` | refused while `STRICT_LOCAL_MODE=true` |

With strict mode on, `AI_BASE_URL` must be loopback, a private IP, a Docker service name,
or an internal DNS name; otherwise AVA refuses to send anything and reports the engine
offline.

## Choosing a model (after the server audit)
Pick based on docs/ENVIRONMENT.md. Guidance for instruction-tuned models in 4-bit (Q4_K_M):

| Server | Suggested | Expectation |
|---|---|---|
| CPU only, 16 GB RAM, AVX2/AVX-512 | 7–8B (e.g. `llama3.1:8b-instruct-q4_K_M`, `qwen2.5:7b-instruct`) | ~3–8 tokens/s; fine for short answers and drafts |
| CPU only, 32–64 GB RAM | 7–14B | slower but better writing; keep answers short |
| GPU 12–16 GB VRAM | 8–14B | fast, comfortable for daily use |
| GPU 24 GB VRAM | 14–32B (Q4) | recommended for reports and Spanish/English drafting |
| GPU 48 GB+ / multiple | 70B (Q4) via vLLM | best quality |

Evaluate 2–3 candidates on real office questions (in Spanish and English) before
committing. Change with `AI_MODEL` (and record it in Settings).

Embeddings (Phase 2): `nomic-embed-text` (768-dim) or `bge-m3` (multilingual, better for
Spanish) served locally through the same provider.

## Operations
* Health: Settings → System status, or `GET /health/ai` (`ok`/`unavailable`).
* Timeouts: `AI_TIMEOUT_SECONDS` (default 120) — CPU inference on long prompts is slow.
* Context budget: `AI_MAX_CONTEXT_CHARS` (default 12,000) — only relevant data is sent.
