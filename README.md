# react-ai-development

Monorepo for `@shrey/react-ai`: a production-grade React hook library for managing end-to-end AI request lifecycles, paired with a companion FastAPI reference backend.

## Architecture

```text
┌───────────────────────────┐
│     React Application     │
│   (Consumer / apps/demo)  │
└─────────────┬─────────────┘
              │
              │  useAI() Hook
              ▼
┌───────────────────────────┐
│     @shrey/react-ai       │  <-- Published NPM Package
│  (Lifecycle / State M/C)  │      (packages/react-ai)
└─────────────┬─────────────┘
              │
              │  HTTP POST / SSE (text/event-stream)
              ▼
┌───────────────────────────┐
│      FastAPI Backend      │  <-- Companion Reference Server
│  (CORS / LLM Proxy Layer) │      (backend/)
└─────────────┬─────────────┘
              │
              │  Gemini SDK / API Key
              ▼
┌───────────────────────────┐
│     Google Gemini API     │
└───────────────────────────┘
```

## Repository Structure

```text
react-ai-development/
├── apps/                 # Example demo consumers for integration testing
├── backend/              # Companion FastAPI server (Gemini proxy & streaming)
│   ├── app/              # Application modules, routes, services
│   ├── .env.example      # Environment variable template
│   └── requirements.txt  # Python backend dependencies
├── packages/
│   └── react-ai/         # Source code for @shrey/react-ai npm package
│       ├── src/          # useAI hook, reducer state machine, types, stream reader
│       ├── package.json  # NPM package manifest
│       └── README.md     # Package-specific documentation for npmjs.com
├── package.json          # Root workspace configuration
└── README.md             # Monorepo setup and architecture guide
```

## Quickstart

Run the FastAPI backend and a consumer frontend locally.

### 1. FastAPI Reference Backend

From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

**Windows (PowerShell):**

```powershell
.venv\Scripts\Activate.ps1
```

**Linux/macOS:**

```bash
source .venv/bin/activate
```

Install dependencies and configure the environment:

```bash
pip install -r requirements.txt
cp .env.example .env
```

Set `GEMINI_API_KEY` in the `backend/.env` file, then start the server:

```bash
uvicorn app.main:app --port 8000 --reload
```

The FastAPI server runs at [http://localhost:8000](http://localhost:8000).

- **Swagger API documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend Application

From the repository root, install dependencies and start a demo app:

```bash
npm install
npm run dev --workspace=apps/<demo-app-name>
```

Replace `<demo-app-name>` with the name of a workspace listed under `apps/`.

## Package Installation

Install the published client library in a React 18+ application:

```bash
npm install @shrey/react-ai
```

## Basic Usage

```tsx
import { useAI } from "@shrey/react-ai";

export function ChatComponent() {
  const {
    data,
    error,
    isPending,
    isStreaming,
    generate,
    cancel,
    reset,
  } = useAI({
    endpoint: "http://localhost:8000/api/ai",
    streaming: true,
    retry: 2,
    timeout: 30000,
  });

  return (
    <div>
      <button
        onClick={() =>
          generate({ prompt: "Explain event loops in JavaScript" })
        }
        disabled={isPending}
      >
        {isPending ? "Generating..." : "Submit"}
      </button>

      {isStreaming && (
        <button onClick={cancel}>Stop Generation</button>
      )}

      {error && <button onClick={reset}>Reset</button>}

      <div>{data}</div>
      {error && <p style={{ color: "red" }}>{error.message}</p>}
    </div>
  );
}
```
