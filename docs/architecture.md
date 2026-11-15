# Project Graveyard --- System Architecture

## 1. Overview

Project Graveyard helps users archive unfinished software projects,
understand their technical identity, discover relationships between
projects, and manage revival attempts.

Its three pillars are:

-   **Remember:** project archive, descriptions, status, abandonment
    reasons, autopsies, notes and timelines.
-   **Understand:** structured Project DNA, embeddings, semantic
    retrieval and evidence-backed cross-project explanations.
-   **Revive:** explainable Revival Score, revival choices, roadmap and
    progress tracking.

### Project entry paths

**GitHub import:** GitHub profile connection is mandatory during
onboarding, even if the user has no repositories. Repository import is
optional. For an imported repository, AI generates draft Project DNA
from accessible repository information. The user reviews, edits and
confirms it before saving.

**Manual addition:** the user enters project details and manually fills
the Project DNA fields. AI does not automatically generate DNA for this
path.

Both paths use the same Project DNA schema. Embeddings are generated
only after confirmed DNA is saved.

## 2. Technology Stack

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Frontend                React + Vite            User interface

  Backend                 Node.js + Express       REST API and
                                                  application logic

  Database                MongoDB Atlas           Application data

  ODM                     Mongoose                MongoDB schemas and
                                                  queries

  Authentication          Supabase Auth + GitHub  Authentication and
                          OAuth                   GitHub sign-in

  Repository access       GitHub API              Authorized repository
                                                  information

  AI                      Gemini API              DNA, similarity
                                                  explanations, Revival
                                                  Score and roadmap

  Vector search           MongoDB Atlas Vector    Semantic retrieval
                          Search                  

  File storage            Supabase Storage        Uploaded
                                                  project-related files

  Frontend hosting        Vercel                  Deployment

  Backend hosting         Render                  Deployment
  -----------------------------------------------------------------------

MongoDB Atlas is the primary application database. Supabase is used for
authentication and file storage, not as the application database.
MongoDB Atlas Vector Search replaces pgvector.

## 3. High-Level Architecture

``` text
Browser
   |
   v
React + Vite (Vercel)
   |
   | HTTPS / REST
   v
Node.js + Express (Render)
   |
   +---- Authentication ----> Supabase Auth / GitHub OAuth
   |
   +---- Repository access -> GitHub API
   |
   +---- Application data --> Mongoose --> MongoDB Atlas
   |                                      |
   |                                      +--> Atlas Vector Search
   |
   +---- AI workflows ------> Gemini API
   |                            | Key 1: Project DNA generation
   |                            | Key 2: Similarity explanations
   |                            + Key 3: Revival Score and roadmap
   |
   +---- File storage -------> Supabase Storage
```

## 4. Frontend Architecture

The frontend is a React application built with Vite.

Responsibilities: - Authentication and onboarding. - GitHub profile
connection and repository selection. - Manual project creation and
Project DNA forms. - Project archive, project details and autopsy. -
Timeline and revival management. - Similar-project results and
evidence. - Dashboard, statistics and Today's Dig.

Folder responsibilities:

  Directory       Responsibility
  --------------- -------------------------------------------
  `components/`   Reusable UI components grouped by feature
  `pages/`        Route-level screens
  `layouts/`      Shared page layouts
  `routes/`       Application and protected routes
  `services/`     Calls to the Express API
  `context/`      Shared client-side state
  `hooks/`        Reusable React hooks
  `utils/`        Formatting and helper functions
  `styles/`       Global styles and design variables

The frontend must not contain Gemini secrets, GitHub client secrets or
Supabase service-role credentials.

## 5. Backend Architecture

The backend uses Node.js and Express. It follows an MVC-inspired
structure, with separate services for business logic and AI workflows.

### Request lifecycle

``` text
Frontend
   |
Express Route
   |
Middleware (authentication / validation)
   |
Controller
   |
Service
   +----> AI workflow (when required)
   |
Mongoose Model
   |
MongoDB Atlas
   |
Response to frontend
```

  -----------------------------------------------------------------------
  Directory                           Responsibility
  ----------------------------------- -----------------------------------
  `config/`                           Environment, database, Supabase,
                                      GitHub and Gemini configuration

  `models/`                           Mongoose schemas and models

  `controllers/`                      HTTP request and response handling

  `routes/`                           REST API endpoint definitions

  `services/`                         Business logic and orchestration

  `ai/`                               Gemini clients, prompts, generation
                                      and embeddings

  `middleware/`                       Authentication, error handling and
                                      request processing

  `validators/`                       Request payload validation

  `utils/`                            Shared helpers, errors, responses
                                      and logging
  -----------------------------------------------------------------------

Controllers should remain thin. Business rules belong in services.
Database operations use Mongoose models through the relevant services.

## 6. Authentication and GitHub Integration

GitHub profile connection is mandatory during onboarding, even if the
user has zero repositories. Importing repositories is optional.

Supabase Auth provides authentication with GitHub OAuth. GitHub API
access retrieves repositories and repository information the user has
authorized.

The backend must verify the authenticated user's identity and
authorization before accessing private project data. Request only the
GitHub permissions required by the application.

A user with zero repositories can still use manual project entry.

## 7. Project Entry Workflows

### 7.1 GitHub import

``` text
Connect GitHub profile
        |
Select accessible repository
        |
Fetch authorized repository information
        |
Gemini generates draft Project DNA
        |
User reviews, edits and confirms DNA
        |
Save project and confirmed DNA
        |
Generate and save embedding
```

AI analysis must distinguish verified, inferred and unavailable
information. Do not claim to have inspected inaccessible files or code.

### 7.2 Manual addition

``` text
Add project manually
        |
Enter project details
        |
User manually fills Project DNA
        |
User reviews and saves
        |
Generate and save embedding
```

There is no automatic AI DNA generation in the manual-entry workflow.

## 8. Project DNA

Project DNA is the structured technical identity of a project. It can
include:

-   Purpose and description.
-   Programming languages and technology stack.
-   Features and functionality.
-   Architecture and important modules.
-   Dependencies.
-   APIs and integrations.
-   Database structure.
-   Reusable components.
-   Relevant source-file references, where available.
-   README and repository documentation references.

Both entry paths use the same schema. When important DNA fields change
after confirmation, regenerate the corresponding embedding so semantic
search reflects the saved version.

## 9. Gemini AI Architecture

The backend uses three task-specific Gemini configurations, each with
its own environment variable and model configuration.

### Key 1 --- Project DNA generation

Used for GitHub-imported projects only: - Analyze accessible repository
information. - Extract purpose, features, stack, architecture and
dependencies. - Identify possible reusable components and source
references where available. - Return structured output matching the
Project DNA schema. - Mark uncertain, inferred or unavailable
information.

Manual DNA is filled by the user.

### Key 2 --- Cross-project similarity explanations

-   Receive candidate projects retrieved through MongoDB Atlas Vector
    Search.
-   Compare purpose, features, stack and architecture.
-   Explain overlaps and differences.
-   Identify possible reusable components.
-   Provide supporting project/source references where available.

Matches are suggestions, not proof of code compatibility or verified
reuse. The user chooses Reuse, Combine, Revive or Ignore.

### Key 3 --- Revival Score and roadmap

The Revival Score is an explainable AI-assisted estimate, not an
objective measure of project quality.

Factors: - Completion level. - Documentation of unfinished tasks. -
Dependency health. - Manageability of blockers. - Project readiness.

Responsibilities: - Return a score and reasons. - Explain contributing
factors. - Generate a practical three-step revival roadmap. - Support
Restart, Continue, Change, Repurpose or Archive choices.

Roadmap tasks are stored so users can add/edit tasks, mark them complete
or pending, and track progress.

### Environment configuration

``` env
GEMINI_DNA_API_KEY=
GEMINI_DNA_MODEL=

GEMINI_SIMILARITY_API_KEY=
GEMINI_SIMILARITY_MODEL=

GEMINI_REVIVAL_API_KEY=
GEMINI_REVIVAL_MODEL=
```

Separate keys provide configuration separation but do not guarantee
independent quotas or billing limits. Provider limits may apply at
project or account level. Keep all keys on the backend.

## 10. Embeddings and Semantic Search

After confirmed Project DNA is saved:

1.  Prepare text from the confirmed DNA fields.
2.  Generate an embedding using the configured embedding model.
3.  Store the vector and project reference in MongoDB.
4.  Use MongoDB Atlas Vector Search to retrieve similar projects.
5.  Pass candidates to the similarity explanation workflow when
    required.

Vectors in the same search index must use a compatible embedding model
and dimensions. If the embedding model changes, existing vectors may
need regeneration. Vector search retrieves candidates; Gemini provides
natural-language explanations.

## 11. MongoDB Data Model

Initial collections:

  -----------------------------------------------------------------------
  Collection                          Purpose
  ----------------------------------- -----------------------------------
  `users`                             User profile and
                                      authentication-provider references

  `projects`                          Project details, source, status and
                                      abandonment information

  `projectdnas`                       Structured Project DNA

  `embeddings`                        Embedding vectors and project
                                      references

  `timelines`                         Milestones, status changes and
                                      revival history

  `revivals`                          Revival Score, explanations,
                                      selected path and roadmap tasks

  `activities`                        User activity and dashboard events
  -----------------------------------------------------------------------

User-owned project data must include ownership references. Backend
queries must enforce ownership so users cannot access one another's
private projects.

Configure Atlas Vector Search indexes in MongoDB Atlas to match the
embedding model and dimensions.

## 12. Storage Architecture

Supabase Storage stores project-related uploaded files where required.
MongoDB stores application records and references to stored files. Large
file contents should not be placed directly inside ordinary project
documents.

File access must be restricted to authorized users.

## 13. Core Backend Modules

  Module        Responsibility
  ------------- -------------------------------------------------
  Auth          Authentication and GitHub connection
  Users         User profile and preferences
  Projects      Manual entry, import, archive and details
  GitHub        Repository listing and authorized analysis
  Project DNA   DNA review, editing and persistence
  Similarity    Candidate retrieval and comparison explanations
  Revival       Score, revival choices and roadmap
  Timeline      Milestones, status changes and revival attempts
  Dashboard     Statistics, recent activity and Today's Dig

## 14. Security and Data Protection

-   Keep private API keys and secrets in backend environment variables.
-   Never expose Gemini keys, GitHub client secrets or Supabase
    service-role credentials in frontend code.
-   Verify authenticated users on protected endpoints.
-   Enforce project ownership in all data access operations.
-   Validate and sanitize request payloads.
-   Request only necessary GitHub permissions.
-   Avoid logging tokens, API keys or private repository contents.
-   Use HTTPS in deployed environments.
-   Restrict file access with storage policies.
-   Handle AI-provider errors, rate limits and timeouts safely.

## 15. Deployment Architecture

``` text
User Browser
     |
     v
Vercel (React + Vite)
     |
     v
Render (Node.js + Express API)
     |
     +----> MongoDB Atlas
     +----> Supabase Auth
     +----> Supabase Storage
     +----> GitHub API
     +----> Gemini API
```

Configure environment variables separately for local development and
deployed environments. Do not commit production secrets to Git.

## 16. Development Phases

1.  **Foundation:** initialise React + Vite and Express; configure Git
    and environment variables.
2.  **Database:** create MongoDB Atlas database, connect Mongoose and
    define initial models.
3.  **Authentication:** integrate Supabase Auth and GitHub OAuth;
    enforce mandatory GitHub profile connection.
4.  **Project Archive:** implement manual entry, repository import,
    details, statuses and autopsy.
5.  **Project DNA:** implement shared schema, GitHub AI-generation
    workflow and manual DNA form.
6.  **Embeddings and Similarity:** generate embeddings after DNA
    confirmation, configure Atlas Vector Search and implement
    evidence-backed explanations.
7.  **Revival Engine:** implement Revival Score, explanations, roadmap
    generation and task tracking.
8.  **Dashboard:** implement statistics, recent activity, timelines and
    Today's Dig.
9.  **Testing and Deployment:** test ownership, security, workflows, AI
    limits and deployment.

## 17. Architecture Principles

-   Keep frontend, backend and database responsibilities separate.
-   Use MVC-inspired backend organisation with business logic in
    services.
-   Use one shared Project DNA schema for both entry paths.
-   Generate embeddings only from confirmed, saved DNA.
-   Keep the three Gemini workflows task-specific.
-   Treat AI matches as suggestions and show evidence where available.
-   Enforce user-data ownership on the backend.
-   Build and test incrementally.
