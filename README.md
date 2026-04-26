# InspireHubCRM

Production-ready CRM Leads Automation System built with Next.js, Firebase, and ShadCN UI.

## Project Structure

- **Agent Portal**: Lead capture, activity tracking, wallet management, and performance monitoring.
- **Manager Portal**: Team oversight, idle lead intervention, detailed analytics, and target setting.
- **Admin Portal**: System configuration, agent CRUD, tier management, product resource center, and audit logs.

## How to push to GitHub

To push this project to your own GitHub repository, follow these steps from your terminal:

1. **Initialize Git**:
   ```bash
   git init
   ```

2. **Add all files**:
   ```bash
   git add .
   ```

3. **Commit your changes**:
   ```bash
   git commit -m "Initial commit of InspireHubCRM"
   ```

4. **Create a repository on GitHub**:
   Go to [GitHub](https://github.com/new) and create a new empty repository (do not initialize with README).

5. **Link and Push**:
   Replace `<your-github-repo-url>` with the URL from GitHub.
   ```bash
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database/Auth**: Firebase (Firestore & Auth)
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI / Lucide Icons
- **State Management**: Zustand
