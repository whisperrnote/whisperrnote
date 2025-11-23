Whisperrnote — Architecture Overview (Language-agnostic)

Purpose
- Explain high-level structure and responsibilities of the Whisperrnote system for engineers and architects.
- Provide a quick reference for onboarding, design decisions, and components without requiring language-specific details.

Scope
- Frontend application (UI, routing, state, components)
- Backend and server-side APIs
- Integrations (AI providers, Appwrite, blockchain, external storage)
- Data flow, storage, and security considerations
- Deployment, developer workflows, and operational notes

1. System Overview
- Whisperrnote is a web-first note-taking and AI-assisted editing application. It provides a rich client UI, server-side APIs, and integrations with AI services and identity/back-end storage.
- The project follows a modular structure: a frontend app (Next.js), shared utilities, integration adapters, and small scripts for ops/tests.

2. Major Components
- Frontend (UI)
  - Purpose: Interactive note creation, editing, search, and sharing features with AI assistance.
  - Location: `src/` (app and components directories)
  - Key parts:
    - Pages & Routing: Located under `src/app/`. Routes follow a convention-based structure where each folder maps to a route. Examples: `landing`, `pitch`, `verify`, `reset`, note-specific routes in `shared/[noteid]`.
    - UI Components: `src/components/` contains reusable components like `NoteEditor`, `NoteCard`, `AppHeader`, search components, modals, and theme providers.
    - State & Context: `src/contexts/NotesContext.tsx` and components use React context/hooks for state management and local UI state.
    - Styles: TailwindCSS utility classes with `globals.css` and `tailwind.config.ts`.

- Backend & API
  - Purpose: Provide server-side endpoints for AI-assisted operations, integration glue, authentication utilities, and helper services used by the frontend.
  - Location: `src/app/api/` and `src/lib/` for shared server utilities.
  - Key parts:
    - API Routes: `src/app/api/*` contains route handlers for AI interactions and other server-side endpoints.
    - AI Service Abstraction: `src/lib/ai-service.ts` (and `src/lib/ai/providers`) provides a pluggable abstraction over different AI providers.
    - Integrations: `src/lib/integrations.ts` and `src/integrations/` adapters for services such as Appwrite, Gemini, Umi, and ICP.
    - Appwrite adapter: `src/lib/appwrite.ts` and `src/lib/appwrite/*` manage Appwrite API keys, request signing, and document operations.
    - Auth utilities: `src/lib/auth.ts` and `src/lib/auth-utils.ts` for authentication flows, wallet-based nonce signing, and helpers.

- Integrations
  - AI Providers
    - The app supports multiple AI backends via adapters under `src/lib/ai` and `src/integrations/gemini/`. These adapters normalize requests/responses so the frontend and server can switch providers with minimal changes.
  - Appwrite
    - Used as a primary backend-as-a-service for user management, storage, and database-like operations. There are utility scripts and typed definitions under `src/lib/appwrite` and `src/types/appwrite.*`.
  - Blockchain / ICP
    - Some features integrate with blockchain or ICP (Internet Computer Protocol) via `src/lib/icp` and `src/lib/blockchain/*`. These provide helper utilities and client code.
  - Other Integrations
    - `umi` client and other connectors are present to support external services.

3. Data Flow
- User Interaction Flow
  1. User opens the web UI (Next.js frontend) which either retrieves user session data or redirects to authentication flows.
  2. The frontend requests note data from server-side APIs or Appwrite directly (depending on the route and SSR/CSR implementation).
  3. When AI features are invoked (e.g., generate, summarize), the frontend calls server-side API routes which:
     - Validate input and user permissions
     - Route the request to the configured AI provider adapter
     - Post-process results and return them to the client
  4. Notes and metadata are stored in Appwrite or encrypted locally depending on features; cryptographic helpers exist in `src/lib/encryption`.

- Server-to-Provider Flow
  - The server ensures sensitive keys are not exposed to the client. Requests to AI providers run server-side where API keys and signing logic are stored in environment variables.
  - Provider adapters handle provider-specific payload shaping, rate limiting, and error handling.

- Offline & Local Considerations
  - Components like `NoteEditor` handle local state and may persist drafts to local storage before committing changes to the backend.

4. Security and Privacy
- Secrets Management
  - API keys and secrets are expected to be supplied via environment variables (see `.sample` and `env.sample`). The repo contains `appwrite.json` and `appwrite` helpers but the `AGENTS.md` warns not to edit some appwrite files.
- Authentication
  - Appwrite identity and wallet-based nonce flows are used for login/verification. Helpers for signing and verifying wallet signatures exist under `src/lib/auth` and `src/lib/wallet-nonce.ts`.
- Data Protection
  - There's an `encryption` library under `src/lib/encryption` for client-side or server-side encryption needs.
- Client Trust Boundaries
  - Sensitive operations (AI calls, key use) happen server-side. The frontend receives sanitized responses only.

5. Developer Workflow & Tooling
- Scripts
  - Repo includes `scripts/` for environment orchestration (`init-nodes.sh`, `start-nodes.sh`, etc.).
- Builds & Local Dev
  - Next.js dev server used in development: `npm run dev` (configured to run on port 3001). Production build via `npm run build`.
- Linting & Formatting
  - ESLint and TailwindCSS are configured; follow repository guidelines in `AGENTS.md` and `CONTRIBUTING.md`.
- Testing
  - No test framework is configured by default. Add tests intentionally and align with existing patterns if introducing testing.

6. Deployment
- Typical deployment targets: Vercel or similar platforms supporting Next.js (serverless functions + static assets).
- Environment variables must be configured in deployment for Appwrite, AI provider keys, and any blockchain credentials.
- Build output is Next.js production assets; server-side API routes become serverless endpoints.

7. Observability & Operations
- Logging
  - Use service-side logging in API routes. The repo includes `dev.log` as a local artifact.
- Monitoring
  - No built-in monitoring agents; recommend integrating Sentry/Datadog for error and performance monitoring.

8. Extensibility & Design Principles
- Adapter Pattern
  - Integrations (AI, Appwrite, ICP) follow an adapter-style approach to allow swapping providers with minimal change.
- Separation of Concerns
  - Frontend handles UI and interaction; heavy lifting (AI, auth) handled server-side to protect secrets and centralize logic.
- Minimal Surface Area
  - Keep provider-specific logic on the server, keep shared utilities in `src/lib` to avoid duplication.

9. Notable Files and Directories (Quick Reference)
- `src/app/` - Next.js app routes and page components
- `src/components/` - Reusable UI components
- `src/lib/` - Server and shared utilities (AI, auth, integrations, encryption)
- `src/integrations/` - Third-party integration adapters
- `src/contexts/` - React contexts and state providers
- `scripts/` - Dev and ops scripts
- `public/` - Static assets

10. Recommendations and Next Steps
- Add architecture diagrams (sequence diagrams for AI flows, component diagrams for frontend) for faster onboarding.
- Add automated tests for critical adapters (AI providers, Appwrite access) and auth flows.
- Introduce CI checks for linting and build verification.
- Add runtime secrets checks for local dev and CI to avoid missing configuration.

Appendix
- This overview is intentionally language-agnostic and focuses on system responsibilities, boundaries, and integration points. For implementation details, consult the files under `src/` and `scripts/`.
