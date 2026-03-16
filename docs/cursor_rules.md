# Cursor Rules — Exim Operation System

## Purpose
This file defines the engineering rules, coding standards, and architectural constraints that Cursor must follow when generating or modifying code for the **Exim Operation System**.

Cursor must treat this file as a mandatory implementation guide.

---

## 1. Project Context

### Project Name
Exim Operation System

### Scope
Phase 1 — Import Operation only

### Stack
- Frontend: Next.js
- Backend: Node.js
- Database: PostgreSQL
- Containerization: Docker Compose

### Project Root Folders
- `assets/`
- `frontend/`
- `backend/`
- `docs/`

### Source of Truth Priority
If there is any conflict between documents, Cursor must follow this order:
1. API Specification
2. Technical Specification Document (TSD)
3. ERD
4. PRD

---

## 2. Global Rules

1. Do not generate tutorial-style code.
2. Do not generate placeholder/demo modules unless explicitly requested.
3. Do not invent business rules that are not grounded in the provided docs.
4. Do not silently overwrite existing files without good reason.
5. Prefer extending the current structure over rewriting large areas.
6. Keep code modular, production-oriented, and easy to extend.
7. Use clean, readable, enterprise-style architecture.
8. When assumptions are necessary, state them clearly in comments or README.
9. Do not hardcode secrets, credentials, ports, or environment-specific values.
10. All configurable values must come from environment variables or shared config.

---

## 3. Architecture Rules

## 3.1 Backend Architecture
Backend must follow modular architecture.

Expected structure:

```text
backend/src/
  config/
  db/
  middlewares/
  shared/
  utils/
  modules/
```

Each module must be organized as:

```text
module-name/
  controllers/
  services/
  repositories/
  routes/
  validators/
  dto/
```

### Backend Modules
Required modules:
- `auth`
- `users`
- `master-data`
- `import-transactions`
- `transaction-status`
- `documents`
- `document-versions`
- `notes`
- `dashboard`

### Backend Layer Responsibilities
- **routes**: define endpoint mappings only
- **controllers**: parse request and return response only
- **services**: business logic only
- **repositories**: database access only
- **validators/dto**: input schema and request validation
- **middlewares**: authentication, RBAC, error handling, logging, validation wiring

### Backend Separation Rules
- Controllers must not contain heavy business logic.
- Controllers must not contain raw SQL.
- Services must not directly manage HTTP responses.
- Repositories must not contain business workflow logic.
- Validation must happen before business logic execution.

---

## 3.2 Frontend Architecture
Expected structure:

```text
frontend/
  app/
  components/
  hooks/
  services/
  lib/
  types/
  styles/
  middleware/
```

Recommended component grouping:

```text
components/
  layout/
  navigation/
  tables/
  forms/
  badges/
  timeline/
  cards/
  modals/
```

### Frontend Rules
- Use reusable components.
- Keep page files thin.
- Move API calls into service layer.
- Move shared types into `types/`.
- Keep styling consistent with design tokens.
- Route protection must be centralized, not duplicated everywhere.

---

## 4. Design System Rules
There is an existing file:

```text
frontend/design-token.json
```

Cursor must follow these rules:

1. Treat `frontend/design-token.json` as the design source of truth.
2. Do not invent new colors, spacing, typography, or UI tokens unless explicitly requested.
3. Reuse the tokens consistently across all components.
4. If token mapping utilities are needed, create them in a reusable way.
5. Components must be styled to align with the existing design token definitions.
6. Avoid inline style duplication when a shared token utility can be used.

---

## 5. Naming Conventions

### General
- Use clear, descriptive names.
- Avoid abbreviations unless they are domain-standard.
- Keep naming consistent across backend and frontend.

### Backend
- Database tables: `snake_case`
- Database columns: `snake_case`
- JavaScript/TypeScript variables and functions: `camelCase`
- Classes / DTOs / Types: `PascalCase`
- Route paths: `kebab-case`
- Environment variables: `UPPER_SNAKE_CASE`

### Frontend
- React components: `PascalCase`
- Hooks: `useSomething`
- Utility files: descriptive lowercase names
- Shared constants: clear domain-based naming

---

## 6. API Rules

1. Follow the API Specification exactly.
2. Use RESTful resource-oriented route design.
3. All API responses must use the standard response format.
4. All protected endpoints must use authentication middleware.
5. Role restrictions must use RBAC middleware.
6. Validate request payloads before controller logic.
7. Return meaningful error messages.
8. Use proper HTTP status codes.
9. Prepare code structure so Swagger/OpenAPI can be added later.

### Standard Success Response
```json
{
  "success": true,
  "message": "Request processed successfully",
  "data": {},
  "meta": {}
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "field_name",
      "message": "Field is required"
    }
  ]
}
```

---

## 7. Authentication and Security Rules

1. Passwords must never be stored in plain text.
2. Passwords must be hashed on backend using `bcrypt` or `Argon2`.
3. Frontend password hashing must not replace backend password hashing.
4. Support these endpoints:
   - `POST /auth/login`
   - `POST /auth/refresh`
   - `POST /auth/logout`
   - `GET /auth/me`
5. Use short-lived access tokens and longer-lived refresh tokens.
6. Refresh tokens must be revocable.
7. Authentication middleware must protect private routes.
8. Prepare structure for login rate limiting and failed login lock policy.
9. Never expose secrets in source code.
10. Never log raw passwords.

---

## 8. Business Workflow Rules

### 8.1 Import Status Flow
Allowed status sequence:

1. `INITIATE_SHIPPING_DOCUMENT`
2. `BIDDING_TRANSPORTER`
3. `TRANSPORT_CONFIRMED`
4. `READY_PICKUP`
5. `PICKED_UP`
6. `ON_SHIPMENT`
7. `CUSTOMS_CLEARANCE`
8. `DELIVERED`

### Status Rules
- Only valid forward transitions are allowed unless explicit override logic is introduced later.
- Every status update must create a timeline/history record.
- Timeline entries must preserve:
  - transaction id
  - previous status
  - new status
  - remarks
  - changed by
  - changed at

### Document Rules
- One transaction can have multiple documents.
- Documents must support multiple versions.
- Version labels include at least:
  - `DRAFT`
  - `FINAL`
- New version must not overwrite previous versions.
- File storage must be abstracted behind a service interface.
- Metadata persistence must be separated from physical file storage logic.

---

## 9. Database Rules

1. Follow ERD and API needs.
2. Use migration-based schema management.
3. Use indexes where appropriate for frequently queried fields.
4. Preserve audit-relevant historical data.
5. Avoid destructive updates to history tables.
6. Use nullable fields intentionally, not lazily.
7. Keep transaction-critical data stable even if master data changes later.
8. Seed only essential initial data such as roles and admin user if requested.

---

## 10. File and Storage Rules

1. Physical file storage implementation must be abstracted.
2. Do not tightly couple business logic to local disk storage.
3. Create storage service contracts/interfaces where appropriate.
4. Keep document metadata in database.
5. Preserve document version history.
6. Prepare the code so local storage, shared folder, NFS, or object storage can be added later with minimal refactor.

---

## 11. Validation Rules

1. All write endpoints must validate payloads.
2. Use centralized validation approach.
3. Validate required fields, data types, enums, and business constraints.
4. Status update validation must enforce allowed transitions.
5. File upload validation must check file size, type, and required metadata.

---

## 12. Error Handling Rules

1. Use centralized error handling middleware.
2. Do not leak stack traces in production API responses.
3. Use domain-appropriate error messages.
4. Separate validation errors, authentication errors, authorization errors, not-found errors, and unexpected server errors.
5. Keep error format consistent with the API specification.

---

## 13. Logging and Audit Rules

1. Add structured logging where appropriate.
2. Log important security and operational events.
3. Do not log secrets or raw passwords.
4. Preserve status transition history for audit purposes.
5. Preserve document version history for audit purposes.
6. Prefer audit-friendly records for important changes.

---

## 14. README and Documentation Rules

Cursor must generate and maintain these files:
- `README.md` at root
- `backend/README.md`
- `frontend/README.md`

### Root README Must Include
- project overview
- scope
- tech stack
- architecture overview
- folder structure
- environment setup
- docker setup
- local run instructions
- migration instructions
- documentation references

### Backend README Must Include
- backend architecture
- module explanation
- env variables
- migration commands
- run commands
- docker run instructions

### Frontend README Must Include
- frontend structure
- design token usage
- environment variables
- local run instructions

---

## 15. Docker and Environment Rules

1. Create `docker-compose.yml` in the project root.
2. Include at least:
   - frontend
   - backend
   - postgres
3. Add Dockerfiles for frontend and backend.
4. Use `.env.example` files for backend and frontend.
5. Never commit real secrets.
6. Ensure project can run in local development via Docker Compose.

---

## 16. Code Quality Rules

1. Prefer small, focused files.
2. Avoid giant controllers and services.
3. Remove dead code and duplicate logic.
4. Extract reusable helpers when duplication appears.
5. Keep imports organized.
6. Use consistent formatting.
7. Add comments only where they provide real value.
8. Prioritize maintainability over cleverness.

---

## 17. Change Management Rules

When Cursor is asked to modify the codebase:

1. Change only what is required.
2. Do not refactor unrelated areas without request.
3. Preserve existing conventions.
4. If introducing a new pattern, apply it consistently.
5. If a requested change conflicts with source documents, flag the conflict clearly.

---

## 18. Preferred Output Behavior for Cursor

When generating code:

1. Start with a brief implementation plan.
2. Show file paths before file contents.
3. Generate code in a copy-paste-ready format.
4. Keep outputs sequential and practical.
5. When a file is updated, explain why.
6. When assumptions are made, list them clearly.
7. Prioritize runnable implementation over abstract advice.

---

## 19. Anti-Patterns Cursor Must Avoid

Cursor must avoid:
- plain-text password storage
- business logic inside routes
- raw SQL inside controllers
- duplicated validation logic across multiple files
- inconsistent response formats
- hardcoded secrets
- direct tight coupling to one storage mechanism
- large monolithic files with mixed responsibilities
- UI styling that ignores design-token.json
- rewriting entire project structure without explicit request

---

## 20. Suggested First Development Order

1. project structure
2. docker compose and Dockerfiles
3. backend base app setup
4. config and env handling
5. database connection and migration setup
6. auth module
7. RBAC and middleware
8. import transactions module
9. transaction status/timeline module
10. documents module
11. document versions module
12. notes module
13. dashboard module
14. frontend base setup
15. auth flow UI
16. dashboard UI
17. transaction list/detail UI
18. shared components using design tokens
19. README files

---

## 21. Final Instruction to Cursor

Treat this file as a mandatory engineering rulebook.
If code generation conflicts with this file, prefer this file unless the user explicitly overrides it.
If this file conflicts with the API Specification on endpoint behavior or business workflow, the API Specification wins.

