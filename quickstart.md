# Quickstart Guide: MechTrack

Welcome to the MechTrack system! This guide will help you configure and run the Full-Stack application (Node.js/Express Backend and React Frontend).

## Prerequisites
- Node.js installed (v18+)
- A Supabase Project created

## 1. Backend Setup

The backend serves as a secure proxy between your frontend and Supabase, running the API and protecting administrative actions.

1. Navigate to the backend directory:
   ```bash
   cd mechtrack-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   Open `mechtrack-backend/.env` and replace `YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE` with your actual Service Role key (found in Supabase Dashboard -> Project Settings -> API).
   ```env
   PORT=5000
   SUPABASE_URL=https://<your-project-id>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhb... (your service role key)
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
   The backend will start on `http://localhost:5000`.

## 2. Frontend Setup

The frontend provides the user interface for Admins and Mechanics.

1. Navigate to the frontend directory:
   ```bash
   cd mechtrack-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   Open `mechtrack-frontend/.env` and ensure your Supabase URL and Anon Key are set.
   ```env
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhb... (your anon key)
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will start on `http://localhost:5173`.

## 3. Usage

1. Open your browser and navigate to `http://localhost:5173`.
2. Login with your Admin account credentials.
3. Use the **Mechanics Roster** tab to create accounts for mechanics securely.
4. Mechanics can login with the credentials you create for them to see their assigned jobs and earnings history.
