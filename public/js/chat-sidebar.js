let chats = [];
let currentChatId = null;
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn"); 

function addMessageToUI(role, content, imageUrl = null) {

  const messageDiv = document.createElement("div");

  messageDiv.className = role === "assistant" ? "message ai-message" : "message user-message";

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  contentDiv.innerHTML = content;

  if (role === "assistant") {
    contentDiv.style.background = 'rgba(30, 41, 59, 0.5)';
    contentDiv.style.border = '1px solid rgba(255,255,255,0.05)';
    contentDiv.style.borderTopLeftRadius = '0';
    contentDiv.style.borderBottomLeftRadius = '12px';
    contentDiv.style.borderTopRightRadius = '12px';
    contentDiv.style.borderBottomRightRadius = '12px';
  } else {
    contentDiv.style.background = 'rgba(99,102,241,0.2)';
    contentDiv.style.border = '1px solid rgba(99,102,241,0.1)';
    contentDiv.style.borderTopRightRadius = '0';
    contentDiv.style.borderBottomRightRadius = '12px';
    contentDiv.style.borderTopLeftRadius = '12px';
    contentDiv.style.borderBottomLeftRadius = '12px';
  }

  messageDiv.appendChild(contentDiv);

  if (imageUrl) {
    const imageContainer = document.createElement("div");
    imageContainer.className = "message-image-container";
    imageContainer.innerHTML = `<img src="${imageUrl}" alt="Uploaded image" class="message-image">`;
    messageDiv.insertBefore(imageContainer, contentDiv);
  }

  return messageDiv;
}
window.addMessageToUI = addMessageToUI;

const clearChatsBtn = document.getElementById("clearChatsBtn");
const mobileSidebarToggle = document.getElementById("mobileSidebarToggle");
const chatMessages = document.getElementById("chatMessages");
const chatTitle = document.getElementById("chatTitle");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");

initChats();
createExpandButton();

newChatBtn.addEventListener("click", createNewChat);
clearChatsBtn.addEventListener("click", clearAllChats);
toggleSidebarBtn.addEventListener("click", toggleSidebar);
if (mobileSidebarToggle) {
  mobileSidebarToggle.addEventListener("click", () => {
    chatSidebar.classList.toggle("active");
  });
}

function initChats() {
  loadChatsFromStorage();

  if (chats.length === 0) {

    createNewChat();
  } else {

    loadChat(chats[0].id);
    renderChatHistory();
  }
}

function createExpandButton() {

  const expandBtn = document.createElement("button");
  expandBtn.className = "expand-sidebar-button";
  expandBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"></path>
    </svg>
  `;
  expandBtn.addEventListener("click", () => {
    document.body.classList.remove("sidebar-collapsed");
    updateToggleButtonIcon();
  });
  document.body.appendChild(expandBtn);
}

function loadChatsFromStorage() {
  try {
    const storedChats = localStorage.getItem("indium_chats");
    if (storedChats) {
      chats = JSON.parse(storedChats);
    } else {
      chats = [];
    }
  } catch (error) {
    console.error("Error loading chats from storage:", error);
    chats = [];
  }
}

function saveChatsToStorage() {
  try {
    localStorage.setItem("indium_chats", JSON.stringify(chats));
  } catch (error) {
    console.error("Error saving chats to storage:", error);
  }
}

function createNewChat() {
  const newChat = {
    id: generateId(),
    title: "New Chat",
    createdAt: new Date().toISOString(),
    messages: [
      {
        role: "assistant",
        content: "Hello! I'm an AI assistant here to help you. How may I assist you today?"
      }
    ]
  };

  chats.unshift(newChat);
  saveChatsToStorage();

  loadChat(newChat.id);
  renderChatHistory();
}

function loadChat(chatId) {
  currentChatId = chatId;
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  if (chatTitle) {
    chatTitle.textContent = chat.title;
  }

  if (chatMessages) {
    chatMessages.innerHTML = "";
    chat.messages.forEach(msg => {
      const msgElement = addMessageToUI(msg.role, msg.content, msg.imageUrl);
      if (msgElement) {

        if (msg.role === "assistant") {
          const contentDiv = msgElement.querySelector('.message-content');
          if (contentDiv) {
            contentDiv.style.background = 'rgba(30, 41, 59, 0.5)';
            contentDiv.style.border = '1px solid rgba(255,255,255,0.05)';
            contentDiv.style.borderTopLeftRadius = '0';
            contentDiv.style.borderBottomLeftRadius = '12px';
            contentDiv.style.borderTopRightRadius = '12px';
            contentDiv.style.borderBottomRightRadius = '12px';
          }
        }
        chatMessages.appendChild(msgElement);
      }
    });
  }

  document.querySelectorAll(".chat-item").forEach(item => {
    if (item.dataset.id === chatId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  if (typeof window.ensureMessageStyling === 'function') {
    window.ensureMessageStyling();
  }
}

function renderChatHistory() {

  try {
    const storedChats = localStorage.getItem("indium_chats");
    chats = storedChats ? JSON.parse(storedChats) : chats;
  } catch (error) {
    console.error("Error parsing chats from localStorage:", error);
  }

  if (!chatHistory) return;
  chatHistory.innerHTML = "";

  chats.forEach(chat => {
    const chatItem = document.createElement("div");
    chatItem.className = "chat-item";
    chatItem.dataset.id = chat.id;

    if (chat.id === currentChatId) {
      chatItem.classList.add("active");
    }

    chatItem.innerHTML = `
      <div class="chat-item-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <div class="chat-item-title">${chat.title}</div>
      <div class="chat-item-actions">
        <button class="chat-item-action delete-chat" title="Delete chat">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    chatItem.addEventListener("click", (e) => {
      if (!e.target.closest(".chat-item-action")) {
        loadChat(chat.id);
      }
    });

    const deleteBtn = chatItem.querySelector(".delete-chat");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteChat(chat.id);
      });
    }

    chatHistory.appendChild(chatItem);
  });
}

function deleteChat(chatId) {
  const confirmDelete = confirm("Are you sure you want to delete this chat?");
  if (!confirmDelete) return;

  chats = chats.filter(chat => chat.id !== chatId);
  saveChatsToStorage();

  if (chatId === currentChatId) {
    if (chats.length > 0) {
      loadChat(chats[0].id);
    } else {
      createNewChat();
    }
  }

  renderChatHistory();
}

function clearAllChats() {
  const confirmClear = confirm("Are you sure you want to clear all chats? This cannot be undone.");
  if (!confirmClear) return;

  chats = [];
  saveChatsToStorage();
  createNewChat();
}

function toggleSidebar() {
  document.body.classList.toggle("sidebar-collapsed");
  updateToggleButtonIcon();
}

function updateToggleButtonIcon() {
  if (toggleSidebarBtn) {
    if (document.body.classList.contains("sidebar-collapsed")) {
      toggleSidebarBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"></path>
        </svg>
      `;
    } else {
      toggleSidebarBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"></path>
        </svg>
      `;
    }
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function extractChatTitle(content) {

  const titleMatch = content.match(/<chat-title>(.*?)<\/chat-title>/);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }

  let title = content.trim();
  if (title.length > 30) {
    title = title.substring(0, 30) + "...";
  }
  return title;
}

window.updateCurrentChat = function(role, content, imageUrl = null) {
  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) return;

  if (role === "assistant") {

    const titleMatch = content.match(/<chat-title>(.*?)<\/chat-title>/);

    if ((!chat.title || chat.title === "New Chat") && titleMatch && titleMatch[1]) {
      const title = titleMatch[1].trim();
      chat.title = title;
      if (chatTitle) {
        chatTitle.textContent = title;
      }
    }

    content = content.replace(/<chat-title>.*?<\/chat-title>/g, '');
  }

  chat.messages.push({
    role: role,
    content: content,
    imageUrl: imageUrl
  });

  saveChatsToStorage();
  renderChatHistory();
};

const originalSendMessage = window.sendMessage;

window.sendMessage = async function() {
  try {

    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;

    const currentUserInput = document.getElementById("userInput");
    if (!currentUserInput) return;

    const userMessage = currentUserInput.value.trim();
    const selectedImage = window.selectedImage;

    if (userMessage || selectedImage) {

      if (typeof originalSendMessage === 'function') {
        await originalSendMessage();
      }
    }
  } catch (error) {
    console.error("Error in sendMessage:", error);
  }
};

window.updateChatTitle = function(title) {
  const chat = chats.find(c => c.id === currentChatId);
  if (chat) {
    chat.title = title;
    if (chatTitle) {
      chatTitle.textContent = title;
    }
    saveChatsToStorage();

  }
};

document.addEventListener("DOMContentLoaded", () => {

  initChats();
  createExpandButton();

  if (chats.length > 0) {
    loadChat(chats[0].id);
  }

  ensureMessageStyling();
});