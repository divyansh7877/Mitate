# ArXiv Visual Explainer - Development Tasks

## 1. Project Setup & Planning
- [x] Review project specification (`docs/arxiv-visual-explainer-spec.md`)
- [x] Create this task list (`docs/tasks.md`)
- [x] Verify frontend environment (React + Vite + ShadCN)
- [x] Install necessary dependencies (e.g., `axios` or `fetch` wrapper, `zod` for validation, `lucide-react` for icons if not present)

## 2. Frontend Development (React + ShadCN)
### 2.1. Landing Page
- [x] Create `LandingPage` component
- [x] Implement search input (Topic or ArXiv link)
- [x] Implement Knowledge Level selector (Beginner, Intermediate, Advanced) using ShadCN `RadioGroup` or `Select`
- [x] Add "Generate Visual Explainer" button
- [x] Add form validation (ensure input is not empty)
- [x] **Tests:** Unit tests for `LandingPage` (rendering, input handling, form submission)

### 2.2. Loading State
- [x] Create `LoadingState` component
- [x] Implement visual indicators for steps:
    - [x] "Finding relevant papers..."
    - [x] "Reading and summarizing..."
    - [x] "Generating your infographic..."
- [x] Add animation or spinner for current active step
- [x] **Tests:** Unit tests for `LoadingState` (props validation, rendering correct steps)

### 2.3. Result Page
- [x] Create `ResultPage` component
- [x] Display Generated Infographic (placeholder or mock image initially)
- [x] Display Paper Metadata (Title, Authors, ArXiv link)
- [x] Add Action Buttons:
    - [x] Download PNG
    - [x] Try Another Topic
    - [x] Adjust Level
- [x] **Tests:** Unit tests for `ResultPage` (rendering data, button clicks)

### 2.4. Navigation & Routing
- [x] Set up Tanstack Router for navigation between Landing -> Loading -> Result
- [x] Manage application state (e.g., using React Context or similar) to pass data between pages (query, status, result)

## 3. Backend Integration Preparation
- [ ] Create `api` service module to handle requests
- [ ] Define types/interfaces for:
    - [ ] `PaperMetadata`
    - [ ] `Summary`
    - [ ] `GenerationStatus`
    - [ ] `InfographicResult`
- [ ] Mock API calls for:
    - [ ] `POST /api/generate` (initiate generation)
    - [ ] `GET /api/status/{id}` (poll status)

## 4. End-to-End Testing
- [x] Create a Playwright or Cypress test for the full user flow (Landing -> Loading -> Result) using mock data.

## 5. Documentation & Wrap-up
- [ ] Update README.md with running instructions
- [ ] Ensure all code is linted and formatted
