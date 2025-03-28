document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  if (!currentUser) {
    window.location.href = "index.html"
    return
  }

  // Set user information
  document.getElementById("user-name").textContent = currentUser.name
  
  // Handle avatar display
  const avatarElement = document.getElementById("user-initial")
  if (currentUser.isGoogleUser && currentUser.picture) {
    // For Google users, use their profile picture
    avatarElement.style.backgroundImage = `url(${currentUser.picture})`
    avatarElement.style.backgroundSize = 'cover'
    avatarElement.style.backgroundPosition = 'center'
    avatarElement.textContent = ''
    avatarElement.parentElement.style.backgroundColor = 'transparent'
  } else {
    // For regular users, show initial
    avatarElement.textContent = currentUser.name.charAt(0).toUpperCase()
    avatarElement.style.backgroundImage = 'none'
    avatarElement.parentElement.style.backgroundColor = 'var(--primary-color)'
  }

  // Handle Ragie Connect
  const uploadBtn = document.getElementById("upload-btn")
  uploadBtn.addEventListener("click", async () => {
    try {
      // Initialize Ragie Connect
      const response = await fetch('/api/ragie/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize Ragie Connect');
      }

      const data = await response.json();
      
      // Redirect to Ragie Connect URL
      window.location.href = data.url;
    } catch (error) {
      console.error('Error initializing Ragie Connect:', error);
      alert('Failed to connect to Ragie. Please try again.');
    }
  });

  // Check for Ragie connection success
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('connection_success') === 'true') {
    showNotification('Successfully connected to Google Drive!');
    window.history.replaceState({}, document.title, '/chat.html');
  }

  // DOM elements
  const messagesContainer = document.getElementById("messages-container")
  const messageInput = document.getElementById("message-input")
  const sendButton = document.getElementById("send-button")
  const newChatButton = document.getElementById("new-chat")
  const logoutButton = document.getElementById("logout")

  // State
  let conversationContext = []
  let isProcessing = false

  // Handle input changes to toggle send button state
  messageInput.addEventListener("input", () => {
    sendButton.disabled = !messageInput.value.trim()
  })

  // Add message to UI
  function addMessageToUI(text, sender = 'user', loading = false) {
    const messageElement = document.createElement("div")
    messageElement.classList.add("message")
    messageElement.classList.add(sender === "user" ? "user-message" : "ai-message")

    if (loading) {
      messageElement.innerHTML = '<div class="loading-dots"><div></div><div></div><div></div></div>'
    } else {
      messageElement.innerHTML = `
        <div class="message-content">
          <div class="message-text">${text}</div>
        </div>
      `
    }

    messagesContainer.appendChild(messageElement)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
    return messageElement
  }

  // Send message function
  async function sendMessage() {
    if (isProcessing) return

    const messageText = messageInput.value.trim()
    if (!messageText) return

    // Add user message to UI
    addMessageToUI(messageText)
    conversationContext.push({ sender: 'user', text: messageText })

    // Clear input and disable send button
    messageInput.value = ""
    sendButton.disabled = true
    isProcessing = true

    // Add loading message
    const loadingMessage = addMessageToUI('', 'ai', true)

    try {
      // Send message to AI
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          context: conversationContext
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      // Handle streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5))
              aiResponse += data.content
              loadingMessage.innerHTML = `
                <div class="message-content">
                  <div class="message-text">${aiResponse}</div>
                </div>
              `
              messagesContainer.scrollTop = messagesContainer.scrollHeight
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }

      // Add AI response to context
      conversationContext.push({ sender: 'ai', text: aiResponse })

    } catch (error) {
      console.error('Error:', error)
      loadingMessage.innerHTML = `
        <div class="message-content">
          <div class="message-text error">Sorry, I encountered an error. Please try again.</div>
        </div>
      `
    } finally {
      isProcessing = false
    }
  }

  // Event listeners
  sendButton.addEventListener("click", sendMessage)

  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !sendButton.disabled) {
      e.preventDefault()
      sendMessage()
    }
  })

  newChatButton.addEventListener("click", () => {
    // Clear conversation context
    conversationContext = []

    // Clear UI
    messagesContainer.innerHTML = ""

    // Add welcome message
    addMessageToUI("Hello! I'm your AI assistant. How can I help you today?", "ai")
  })

  logoutButton.addEventListener("click", () => {
    // Remove current user from localStorage
    localStorage.removeItem("currentUser")

    // Redirect to login page
    window.location.href = "index.html"
  })
})

// Show notification
function showNotification(message) {
  const notification = document.createElement('div')
  notification.className = 'notification'
  notification.textContent = message
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.classList.add('fade-out')
    setTimeout(() => notification.remove(), 500)
  }, 3000)
}

