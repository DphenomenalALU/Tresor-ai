# Tresor AI Chat

Tresor AI is a fast, free, secure, and privacy-focused AI chatbot. Unlike traditional AI chat tools, Tresor ensures your conversations and data stay on your device — we don’t track you, and we don't store your data (including your email).

---

## ✨ Features
- ⚡ Blazingly fast responses powered by Groq LLM API.
- 🌐 Multiple model options including LLaMA, Qwen, DeepSeek, and Mistral.
- 🛅 Chat history and favorite messages stored locally in your browser.
- 🔒 Google OAuth login for secure sign-in.
- 📂 Connect your files via Ragie's Google Drive Connector to enable Retrieval-Augmented Generation (RAG).
- 🔍 Easily search for messages and save AI responses or prompts you love. 

---

## 📅 Demo
Try it live at: https://dphenomenal.tech  
> Note: Your data never leaves your browser, everything happens locally. The only exception is when you upload a file via Ragie's Google Drive Connector, and that data is processed by Ragie and fully encrypted using bank-grade standards. 

---

## 💼 API Credits
Tresor AI uses the following APIs and services:

- **[Groq](https://groq.com/)** — For blazing-fast LLM inference
- **[Ragie](https://ragie.ai)** — To securely connect and retrieve Google Drive files for RAG
- **[Google Identity Services](https://developers.google.com/identity)** — For secure OAuth login

If you found this helpful, give it a star ⭐ and share it with friends who care about privacy. 

---

## 🛠 Tech Stack
**Front-end:** 
- HTML, CSS, Vanilla JS
- LocalStorage for session/data management

**Back-end:** 
- Node.js with Express
- Groq SDK for LLMs
- Google OAuth via google-auth-library
- Ragie's Google Drive Connector API for RAG 

**Deployment:** 
- Backend hosted on Render
- Frontend deployed on school servers (web-01, web-02, lb-01), NGINX, HAProxy.
  
---
## 🛠️ Getting Started

### 📦 Requirements
- Node.js v16+
- Git

### 🔐 Environment Variables
The backend is already deployed and configured on Render:

```
APP_URL=https://tresor-backend-0sew.onrender.com
```

> You do **not** need to run the back-end locally. All API requests are handled by the hosted server.

---

## ⚙️ Local Setup (Front-End Only)

```
git clone https://github.com/DphenomenalALU/Tresor-ai.git
cd tresor-ai
npx serve .
```
Then visit: http://localhost:3000

## 🚀 Deploying the Front-end on the School's Server 

To host the frontend on the school-assigned web servers. Use NGINX for serving static assets and HAProxy for load balancing. Here’s a quick breakdown:

### Web Servers Setup
Tresor's front-end is deployed on two web servers (web-01 and web-02) running NGINX. The files are located in:

```
/var/www/tresor
```

Below is the configuration snippet implemented to handle incoming traffic:

```
server {
    listen 80;
    server_name dphenomenal.tech www.dphenomenal.tech;

    # Headers for tracking the server instance
    add_header X-Served-By 6490-web-01;
    error_page 404 /404.html;

    location / {
        root /var/www/tresor;
        try_files $uri $uri/ =404;
    }
}
```

### Load Balancer Configuration
Our load balancer (lb-01) is powered by HAProxy, which sits in front of web-01 and web-02. HAProxy dynamically routes incoming requests based on server health, ensuring high availability and even load distribution. This setup minimizes downtime and keeps performance on point.

### Make sure all API calls point to:

```js
const API_BASE = 'https://tresor-backend-0sew.onrender.com';
```
Again, your JS files (e.g., auth.js, chat.js) should use the hosted API base. 

Update all `fetch()` calls like this:

```
fetch(`${API_BASE}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, context, model })
});
```

---

## 🧪 API Endpoints (served by the hosted backend on Render)

### `POST /api/chat`
- **Body:**
  ```json
  {
    "message": "Hello",
    "context": [...],
    "model": "llama-3.3-70b-versatile"
  }
  ```
- **Returns:** Server-Sent Events (streamed AI response)

---

### `POST /auth/google`
- **Body:**
  ```json
  {
    "credential": "google-id-token"
  }
  ```
- **Returns:**
  ```json
  {
    "user": {
      "id": "...",
      "name": "...",
      "email": "...",
      "picture": "...",
      "isGoogleUser": true
    }
  }
  ```

---

### `POST /api/ragie/init`
- **Body:**
  ```json
  {
    "userId": "123456"
  }
  ```
- **Returns:**
  ```json
  {
    "url": "https://ragie.ai/..."
  }
  ```

---

### `GET /ragie-callback`
- Handles the redirect from Ragie OAuth. On success, redirects to:

```
/chat.html?connection_success=true
```

---
## 📚 Challenges & How I Overcame Them

### Challenge 1: Separating the front-end and back-end

Initially, the project was a monolith. I needed to separate the client and server logic to deploy securely and scale efficiently. This required:

- Refactoring fetch URLs to use full API base paths
- Setting up proper CORS handling
- Ensuring static assets were served separately

**Solution:** Used Render for the back-end and my web servers for the front-end. Rewrote API endpoints and used environment variables to manage base URLs.

---

### Challenge 2: Streaming responses from Groq

Groq's API supports SSE (Server-Sent Events), but integrating it with the front-end while keeping UI responsive was tricky.

**Solution:** Leveraged the `TextDecoder` API and `ReadableStream` to handle incoming chunks of data and update the UI incrementally.

---

### Challenge 3: Securely handling Google OAuth

OAuth flows often break if redirect URIs or environment variables are misconfigured.

**Solution:** I carefully matched redirect URIs in the Google Cloud Console with `APP_URL` on Render. I also used `google-auth-library` for token verification.

---

### Challenge 4: Local data persistence

Since I promised privacy, everything had to be stored locally. Managing user state, threads, and message history with `localStorage` while keeping things fast and clean was challenging.

**Solution:** Implemented a lightweight state management pattern and added autosave logic. Added UI features like favorites and filters without needing a database.




