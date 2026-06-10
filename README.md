
# StudySync AI

A Lovable + TanStack Start project for generating study resources, previous-year questions, and managing a question bank.

## Quick start

### Requirements

- Bun installed
- Node 18+ (if you prefer `npm` instead of Bun)

### Install dependencies

```bash
bun install
```

### Start development server

```bash
bun run dev
```

This project uses Vite, so the local app will usually start at `http://localhost:8080/`. If port `8080` is already in use, Vite will select the next free port (for example `http://localhost:8081/`).

### Environment variables

Create a `.env` file from `.env.example` and provide your values.

Required values:

```env
SUPABASE_PROJECT_ID="your-supabase-project-id"
SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PROJECT_ID="your-supabase-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
```

Optional AI provider values:

```env
LOVABLE_API_KEY="your-lovable-api-key"
LOVABLE_MODEL="gemini-3-flash-preview"
OPENAI_API_KEY="your-openai-api-key"
AI_API_KEY="your-generic-ai-api-key"
AI_API_URL="https://api.openai.com/v1/chat/completions"
AI_MODEL="gemini-3-flash-preview"
```

### Notes

- The app supports a local Gemini Flash preview-style demo mode without any API key.
- Gemini 3 Flash Preview is the default selected chat model in the question generator.
- Provider keys are only required if you want real Gemini/GPT responses from an external service.
- **Lovable Gateway** (Gemini/GPT through one key):
  - Set `LOVABLE_API_KEY` and optionally `LOVABLE_MODEL` (default: `gemini-3-flash-preview`)
  - Available chat models include `gemini-3-flash-preview`, `gemini-3.5-flash`, `gemini-3.1-pro-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`, `gpt-5.5`, `gpt-5.4`, `gpt-5.2`, `gpt-5`, and mini/nano variants.
- **Direct OpenAI**: Set `OPENAI_API_KEY` for ChatGPT-style generation.
- **Any OpenAI-compatible provider**: Set `AI_API_KEY` with `AI_API_URL` and optionally `AI_MODEL`.
- The question generator uses the `pyq` and `sample` modes to produce structured JSON output.
- Generated questions include a difficulty label and are prompted to have deeper, professional student-focused answers with step-by-step solutions.
- In local demo/fallback mode, the app generates unique exam-style questions across supported subjects and avoids repeated question text.
- If you change provider environment variables, restart the dev server.

### How PYQ / Sample generation works

- `src/components/PYQDialog.tsx` collects exam, year, subject, topic, mode, and count from the user.
- It calls the server function `generateQuestions` in `src/lib/ai.functions.ts`.
- When a provider is configured, the server function makes a backend-only request to the selected AI gateway.
- It uses the selected chat model, defaulting to `gemini-3-flash-preview`.
- The prompt asks for strict JSON with `question`, optional `options`, `answer`, `solution`, `year`, and `topic`.
- In PYQ mode, the prompt tells the model to emulate actual previous-year exam paper style.
- In Sample mode, it asks for new practice questions in the same style/difficulty.
- Selected questions are saved to Supabase via `saveQuestionsToBank` and shown in `/question-bank`.

> Important: Gemini can approximate recent or obscure papers from its training data. The worked solutions are AI-generated reasoning, so always cross-check critical questions.

## Useful scripts

```bash
bun run dev
bun run build
bun run preview
bun run lint
bun run format
```

## Project structure

- `src/` — React route components and UI
- `src/lib/ai.functions.ts` — server-side AI generation logic
- `src/components/PYQDialog.tsx` — question generation dialog UI
- `src/routes/_authenticated/question-bank.tsx` — saved question bank page
- `vite.config.js` — Lovable TanStack Vite config
=======
# vibe-coding-hackathon-2026-syntax-squad
Hackathon team repository for Syntax Squad - [hackindia-team:vibe-coding-hackathon-2026:syntax-squad]
>>>>>>> dd6cf2d1b3711ab2b4d0d7fa9d9e3da35668a346
