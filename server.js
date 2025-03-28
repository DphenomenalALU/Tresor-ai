const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Initialize Google OAuth client
const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${process.env.APP_URL}/auth/google/callback`
});

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Chat completion endpoint
app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;

  try {
    console.log('Received chat request:', { message, context });
    
    // Format the conversation context
    const messages = [
      {
        role: "system",
        content: "You are Tresor AI. Respond directly and naturally in plain text. Keep responses short and to the point. No thinking out loud, no markdown, no self-references."
      },
      ...context.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      {
        role: "user",
        content: message
      }
    ];

    console.log('Formatted messages:', JSON.stringify(messages, null, 2));

    // Stream the response
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens: 2048,
      top_p: 0.95,
      stream: true,
      stop: null
    });

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response chunks
    for await (const chunk of chatCompletion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.end();
  } catch (error) {
    console.error('Chat completion error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({ error: 'Failed to generate response', details: error.message });
  }
});

// Google Sign-In endpoint
app.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    // Verify the token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    // Create or update user
    const user = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      isGoogleUser: true
    };

    // In a real application, you would store this in a database
    // For now, we'll send it back to be stored in localStorage
    res.json({ user });
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Initialize Ragie Connect
app.post('/api/ragie/init', async (req, res) => {
  try {
    const response = await axios.post('https://api.ragie.ai/connections/oauth', {
      source_type: "google_drive",
      redirect_uri: `${process.env.APP_URL}/ragie-callback`,
      metadata: {
        user_id: req.body.userId
      },
      mode: "hi_res"
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.RAGIE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ragie initialization error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initialize Ragie Connect' });
  }
});

// Handle Ragie callback
app.get('/ragie-callback', async (req, res) => {
  const { connection_id, error } = req.query;

  if (error) {
    console.error('Ragie connection error:', error);
    res.redirect('/?error=connection_failed');
    return;
  }

  if (connection_id) {
    // Store the connection_id in your database if needed
    console.log('Ragie connection successful:', connection_id);
    res.redirect(`/chat.html?connection_success=true`);
  } else {
    res.redirect('/?error=no_connection_id');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 