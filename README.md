# EthioGPT — Your Ethiopian AI Assistant

EthioGPT is a responsive, multilingual AI assistant web application and Progressive Web App (PWA) designed specifically for Ethiopia and Ethiopian languages. It supports **Afaan Oromo**, **Amharic**, **Tigrinya**, **English**, and **Somali** with streaming AI chat, voice input/output, image analysis, PDF/document extraction, and user accounts.

---

## Zero-Billing Architecture (100% Free Tier Compatible)

EthioGPT is intentionally engineered so you can host and run it online **without a Visa/Mastercard and without Google Cloud billing**:

- **GitHub Free**: Hosts your source code (free public or private repository, no card required).
- **Vercel Hobby (Free)**: Hosts both the React frontend and the `/api/*` serverless backend over HTTPS with a free `.vercel.app` domain (no credit card required when signing up with GitHub).
- **Google AI Studio Free API Key**: Uses `gemini-2.5-flash` via a free Google AI Studio API key (`GEMINI_API_KEY`) — no Google Cloud billing account required.
- **Firebase Spark (Free) Plan**: Powers Google Sign-In, Email/Password auth, and Firestore chat history sync on the free tier.

---

## Features

- **5 Languages**: Full UI localization and culturally grounded AI responses in **Afaan Oromo (Qubee)**, **Amharic (አማርኛ)**, **Tigrinya (ትግርኛ)**, **English**, and **Somali (Af-Soomaali)**.
- **Streaming AI Chat**: Real-time SSE responses with Markdown, GFM tables, copyable code blocks, Regenerate, Copy, Stop, and Clear Conversation.
- **Voice Assistant**: Microphone voice input via browser Web Speech API or AI audio transcription (`/api/transcribe`), plus Read Aloud (TTS) via device voices or audio fallback.
- **Image Analysis**: Automatic client-side photo compression for Android phone cameras, preview before sending, and multimodal AI image understanding.
- **Document & PDF Analysis**: Upload PDF, TXT, Markdown, CSV, or JSON files (up to 4 MB) with progress indicator and server-side text extraction.
- **User Accounts & Cloud History**: Firebase Authentication & Cloud Firestore sync with hardened owner-only security rules (`firestore.rules`), plus local browser storage in guest mode.
- **Installable PWA**: Works offline for viewing cached UI, includes Android/iOS install prompt and home screen icons.

---

## Environment Variables for Vercel

Add these under **Vercel -> Project Settings -> Environment Variables**:

| Variable | Required | Value / Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | **Yes** | Your free API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Kept strictly on the server (`/api/*`). |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-2.5-flash`. Only set if you want to switch to another supported GA Gemini model. |
| `GEMINI_TRANSCRIBE_MODEL` | Optional | Defaults to `gemini-2.5-flash`. |

> **Important Security Notes:**
> - **Never** prefix your Gemini key with `VITE_` and never put it inside `src/` or `index.html`.
> - **Never** upload `.env` to GitHub (`.gitignore` already blocks `.env*` while keeping `.env.example`).
> - `firebase-applet-config.json` contains only public Firebase Web App identifiers (not private admin keys) and is protected by `firestore.rules`.

---

## Deploy Online Using Only an Android Phone (GitHub + Vercel Free)

You do **not** need a laptop, Visa, Mastercard, or Google Cloud billing account.

### Step 1: Get a Free Gemini API Key (No Card Needed)
1. Open **Chrome** on your Android phone and go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Sign in with your Google account and tap **Create API key**.
3. Copy the key and save it temporarily in your phone's notes app (you will paste it into Vercel in Step 4).

### Step 2: Export the Project Files
1. In your workspace on Chrome, download/export the project as a `.zip` file to your Android **Downloads** folder.
2. Open your phone's **Files** app (or **ZArchiver**), tap the `.zip` file, and extract it to a folder named `ethiogpt`.

### Step 3: Push the Project to GitHub
1. In Chrome, go to [github.com](https://github.com) and sign in (or create a free account).
2. Tap **+** -> **New repository**, name it `ethiogpt`, and tap **Create repository**.
3. **Recommended on Android (Termux) so all folders upload cleanly:**
   - Install **Termux** (from F-Droid or Play Store) and run:
     ```bash
     pkg update && pkg install git
     termux-setup-storage
     cd ~/storage/downloads/ethiogpt
     git init
     git add .
     git commit -m "Initial EthioGPT release"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/ethiogpt.git
     git push -u origin main
     ```
   - When prompted for a GitHub password, paste a GitHub **Personal Access Token** (create one at **GitHub -> Settings -> Developer settings -> Personal access tokens -> Tokens (classic)** with `repo` scope).
4. *(Alternative without Termux)*: On your new GitHub repo page, tap **uploading an existing file** and upload the project files (skip `node_modules/`, `dist/`, `dev-dist/`, and any `.env` file).

### Step 4: Deploy on Vercel Free (No Card Needed)
1. In Chrome, open [vercel.com](https://vercel.com) -> **Sign Up** / **Log In** -> **Continue with GitHub**.
2. Tap **Add New...** -> **Project**.
3. Select your `ethiogpt` GitHub repository and tap **Import**.
4. Leave Framework Preset as **Vite** (Vercel reads `vercel.json` automatically for build, SPA routing, and `/api/*` backend routes).
5. Expand **Environment Variables** and add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** *(paste your Gemini API key from Step 1)*
6. Tap **Deploy** and wait ~1–2 minutes for the build to finish.
7. Vercel will give you a live HTTPS URL such as `https://ethiogpt-yourname.vercel.app`.

### Step 5: Allow Your Vercel Domain in Firebase Auth
1. Open [console.firebase.google.com](https://console.firebase.google.com) in Chrome and select your Firebase project (`gen-lang-client-0134508031`).
2. Go to **Build -> Authentication -> Settings -> Authorized domains**.
3. Tap **Add domain**, enter your Vercel domain (example: `ethiogpt-yourname.vercel.app`, without `https://`), and tap **Add**.
4. *(Optional)* If you want Email/Password registration alongside Google Sign-In, go to **Authentication -> Sign-in method -> Add new provider -> Email/Password -> Enable -> Save**.

### Step 6: Install EthioGPT on Your Android Home Screen
1. Open your new `https://...vercel.app` link in **Chrome on Android**.
2. Tap **Install App** inside EthioGPT's sidebar (or Chrome's **3-dot menu -> Add to Home screen**).

---

## Local Development (Optional, for PC/Termux)

```bash
npm install
cp .env.example .env
# Add GEMINI_API_KEY inside .env
npm run dev
```

Production build verification:

```bash
npm run lint
npm run build
NODE_ENV=production npm start
```
