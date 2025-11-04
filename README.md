Supabase is already connected

## To Run the project

```sh
cd backend
npm run dev # for backend

# in another terminal in the top directory
npm run dev # for frontend

```
## Project info

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up Supabase (required for authentication)
# Follow the detailed instructions in SUPABASE_SETUP.md

# Step 5: Set up demo credentials for testing (optional but recommended)
# Follow the instructions in DEMO_CREDENTIALS.md

# Step 6: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## 🧪 Testing the Application

For quick testing, use the demo credentials:
- **Email:** demo@purdue.edu
- **Password:** demo123

See `DEMO_CREDENTIALS.md` for setup instructions.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (for authentication and backend services)

## Backend Microservice

The `backend/` directory contains a lightweight Node + Express TypeScript service that handles authenticated API routes (starting with user profiles) on top of Supabase.

### Environment variables

Add the following to your `.env` (or point `BACKEND_ENV_PATH` to a separate file):

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key-from-supabase
BACKEND_PORT=4000
CORS_ORIGIN=http://localhost:5173
VITE_BACKEND_URL=http://localhost:4000   # frontend uses this base URL
```

The service automatically falls back to `VITE_SUPABASE_URL` if `SUPABASE_URL` is not set, so you can keep a single source of truth.

### Install and run

```sh
cd backend
npm install
npm run dev    # ts-node-dev with live reload
# or
npm run build && npm start
```

### Routes

All protected routes expect a Supabase session token in the `Authorization: Bearer <token>` header.

- `GET /health` – quick service health check.
- `GET /api/profiles/me` – fetch the authenticated user’s profile.
- `GET /api/profiles/:id` – fetch another user’s profile (auth required).
- `POST /api/profiles` – create or replace the caller’s profile.
- `PUT /api/profiles/me` – update the caller’s profile fields.

More ride, join-request, and payment endpoints can be layered onto this service in future sprints using the same token-verification middleware.
