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
Try it live at: _[link]_  
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




