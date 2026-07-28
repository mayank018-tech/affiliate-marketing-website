# NexusAffiliate - Affiliate Marketing Website

A premium, modern affiliate marketing platform built with Node.js, Express, EJS, and Supabase, featuring AI-powered automatic description structuring and Git synchronization.

---

## 🚀 Key Features

*   **Affiliate Portal**: Clean, glassmorphism-based design with vibrant hover effects and micro-animations, presenting products with affiliate links.
*   **AI Auto-Structuring**: Automatically rewrites messy, unreadable product descriptions into structured, conversion-optimized Markdown using Groq/Grok API.
*   **Git Auto-Sync**: The system automatically writes structured descriptions as `.md` files under `descriptions/` and pushes them directly to the Git repository.
*   **Category Icon Picker**: An interactive visual FontAwesome (`fas fa-`) icon selector inside the category manager for admins.
*   **Admin Dashboard**: Secure admin portal to create, modify, and delete categories and products.
*   **Dark Mode Support**: Sleek appearance dynamically matching system settings.

---

## 🛠️ Tech Stack

*   **Backend**: Node.js & Express
*   **Templates & Styling**: EJS Templates & Vanilla CSS
*   **Database & Storage**: Supabase (PostgreSQL + Storage buckets for product images)
*   **Inference Provider**: Groq API (fallback to xAI Grok)
*   **Asset Compression**: Sharp (automatic image square formatting, containment, and conversion to JPEG)

---

## 💻 Getting Started

### 1. Prerequisites
Ensure you have Node.js (v18+) and Git installed.

### 2. Environment Setup
Create a `.env` file in the root directory:

```env
PORT=3000
SESSION_SECRET=your_super_secret_session_key
ADMIN_USERNAME=admin_username
ADMIN_PASSWORD_HASH=bcrypt_hashed_password

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Inference API Key (supports Groq & Grok keys)
GROQ_API_KEY=gsk_your_groq_api_key
```

### 3. Installation
```bash
npm install
```

### 4. Database Seeding
To populate initial categories and products:
```bash
npm run seed
```

### 5. Running Locally
Start the development server with hot-reload enabled:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.
