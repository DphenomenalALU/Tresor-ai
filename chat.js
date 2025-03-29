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

  // Initialize UI elements
  const messagesContainer = document.getElementById('messages-container');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  const searchInput = document.getElementById('search-input');
  const filterTags = document.querySelectorAll('.filter-tag');
  const sortBtn = document.getElementById('sort-btn');
  const newChatBtn = document.getElementById('new-chat');
  const logoutBtn = document.getElementById('logout');
  const chatThreadsContainer = document.getElementById('chat-threads');

  // State management
  let threads = [];
  let currentThreadId = null;
  let messages = [];
  let currentFilter = 'all';
  let sortDirection = 'desc'; // desc = newest first
  
  // State
  let conversationContext = []
  let isProcessing = false

  // Load threads from storage
  function loadThreads() {
    const savedThreads = localStorage.getItem(`chat_threads_${currentUser.id}`);
    threads = savedThreads ? JSON.parse(savedThreads) : [];
    
    if (threads.length === 0) {
      // Create initial thread
      createNewThread();
    } else {
      // Load last active thread
      const lastActiveThread = threads.find(t => t.isActive) || threads[0];
      loadThread(lastActiveThread.id);
    }
    
    renderThreads();
  }

  // Save threads to storage
  function saveThreads() {
    localStorage.setItem(`chat_threads_${currentUser.id}`, JSON.stringify(threads));
  }

  // Create a new thread
  function createNewThread() {
    const thread = {
      id: Date.now(),
      title: "New Chat",  // We'll update this after first message
      preview: "Start a new conversation",
      timestamp: new Date(),
      isActive: true,
      isNew: true  // Flag to track if this is a new thread
    };

    // Deactivate other threads
    threads.forEach(t => t.isActive = false);
    
    threads.unshift(thread);
    currentThreadId = thread.id;
    messages = [];
    
    saveThreads();
    saveMessages();
    renderThreads();
    renderMessages();
    
    // Add initial AI message
    addMessage("Hello! I'm your AI assistant. How can I help you today?", true);
  }

  // Load a specific thread
  function loadThread(threadId) {
    threads.forEach(t => t.isActive = t.id === threadId);
    currentThreadId = threadId;
    
    // Load messages for this thread
    const savedMessages = localStorage.getItem(`chat_messages_${currentUser.id}_${threadId}`);
    if (savedMessages) {
      messages = JSON.parse(savedMessages);
      messages.forEach(m => m.timestamp = new Date(m.timestamp));
    } else {
      messages = [];
    }
    
    saveThreads();
    renderMessages();
  }

  // Render thread list
  function renderThreads() {
    chatThreadsContainer.innerHTML = '';
    
    threads.forEach(thread => {
      const threadElement = document.createElement('div');
      threadElement.className = `thread-item ${thread.isActive ? 'active' : ''}`;
      threadElement.innerHTML = `
        <i class="fas fa-comments thread-icon"></i>
        <div class="thread-content">
          <div class="thread-title">${thread.title}</div>
          <div class="thread-preview">${thread.preview}</div>
        </div>
        <div class="thread-date">${formatDate(thread.timestamp)}</div>
      `;
      
      threadElement.addEventListener('click', () => loadThread(thread.id));
      chatThreadsContainer.appendChild(threadElement);
    });
  }

  // Update thread preview
  function updateThreadPreview(content) {
    const thread = threads.find(t => t.id === currentThreadId);
    if (thread) {
      thread.preview = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      thread.timestamp = new Date();
      saveThreads();
      renderThreads();
    }
  }

  // Generate thread title from content
  async function generateThreadTitle(content) {
    try {
      // Call your AI API to generate a title
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error('Failed to generate title');
      }

      // For now, we'll create a simple title from the content
      // This is a fallback until the API is implemented
      let title = content.split(' ').slice(0, 4).join(' ');
      if (content.length > 25) {
        title = content.substring(0, 25) + '...';
      }
      return title;
    } catch (error) {
      console.error('Error generating title:', error);
      return `Chat ${threads.length}`;
    }
  }

  // Message handling functions
  function addMessage(content, isAI = false) {
    const message = {
      id: Date.now(),
      content,
      isAI,
      timestamp: new Date(),
      favorite: false,
      tags: [isAI ? 'AI' : 'User']
    };

    // Auto-tag messages
    if (content.includes('?')) {
      message.tags.push('questions');
    }
    if (content.includes('```') || content.match(/[<>{}()]/)) {
      message.tags.push('code');
    }

    messages.push(message);
    updateThreadPreview(content);

    // If this is the first user message in a new thread, generate a title
    const thread = threads.find(t => t.id === currentThreadId);
    if (!isAI && thread && thread.isNew && messages.filter(m => !m.isAI).length === 1) {
      generateThreadTitle(content).then(title => {
        thread.title = title;
        thread.isNew = false;
        saveThreads();
        renderThreads();
      });
    }

    renderMessages();
    saveMessages();
  }

  function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.isAI ? 'ai-message' : 'user-message'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = message.content;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    
    // Add tags
    message.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'message-tag';
      tagSpan.textContent = tag;
      actionsDiv.appendChild(tagSpan);
    });
    
    // Add favorite button
    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = `favorite-btn ${message.favorite ? 'active' : ''}`;
    favoriteBtn.innerHTML = `<i class="fa${message.favorite ? 's' : 'r'} fa-star"></i>`;
    favoriteBtn.addEventListener('click', () => toggleFavorite(message.id));
    actionsDiv.appendChild(favoriteBtn);
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(actionsDiv);
    return messageDiv;
  }

  function renderMessages() {
    messagesContainer.innerHTML = '';
    
    // Filter messages
    let filteredMessages = messages.filter(message => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'favorites') return message.favorite;
      return message.tags.includes(currentFilter);
    });
    
    // Sort messages
    filteredMessages.sort((a, b) => {
      return sortDirection === 'desc' 
        ? b.timestamp - a.timestamp 
        : a.timestamp - b.timestamp;
    });
    
    // Apply search filter if search input has value
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
      filteredMessages = filteredMessages.filter(message =>
        message.content.toLowerCase().includes(searchTerm)
      );
    }
    
    filteredMessages.forEach(message => {
      messagesContainer.appendChild(createMessageElement(message));
    });
    
    // Scroll to bottom if not searching/filtering
    if (!searchTerm && currentFilter === 'all') {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Event Listeners
  messageInput.addEventListener('input', () => {
    sendButton.disabled = !messageInput.value.trim();
  });

  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && messageInput.value.trim()) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendButton.addEventListener('click', sendMessage);

  searchInput.addEventListener('input', debounce(() => {
    renderMessages();
  }, 300));

  filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      filterTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      currentFilter = tag.dataset.tag;
      renderMessages();
    });
  });

  sortBtn.addEventListener('click', () => {
    sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    sortBtn.querySelector('span').textContent = `Sort by Date (${sortDirection === 'desc' ? 'Newest' : 'Oldest'})`;
    renderMessages();
  });

  function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) return;

    addMessage(content, false);
    messageInput.value = '';
    sendButton.disabled = true;

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      addMessage('This is a simulated AI response.', true);
    }, 1000);
  }

  function toggleFavorite(messageId) {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.favorite = !message.favorite;
      renderMessages();
      saveMessages();
    }
  }

  // Storage functions
  function saveMessages() {
    localStorage.setItem(`chat_messages_${currentUser.id}_${currentThreadId}`, JSON.stringify(messages));
  }

  function loadMessages() {
    const savedMessages = localStorage.getItem(`chat_messages_${currentUser.id}_${currentThreadId}`);
    if (savedMessages) {
      messages = JSON.parse(savedMessages);
      messages.forEach(m => m.timestamp = new Date(m.timestamp));
      renderMessages();
    }
  }

  // Utility functions
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Initialize
  loadThreads();
  filterTags[0].classList.add('active'); // Activate 'All' filter by default
  
  // Handle logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  });

  // Handle new chat
  newChatBtn.addEventListener('click', createNewThread);
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

// Format date for thread list
function formatDate(date) {
  const now = new Date();
  const messageDate = new Date(date);
  
  if (messageDate.toDateString() === now.toDateString()) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

