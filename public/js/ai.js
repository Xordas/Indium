document.addEventListener("DOMContentLoaded", () => {
  const chatMessages = document.getElementById("chatMessages");
  const userInput = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");
  const chatInputContainer = document.querySelector(".chat-input-container");

  if (chatInputContainer && chatInputContainer.children.length === 0) {

    chatInputContainer.innerHTML = '';

    const chatInputWrapper = document.createElement("div");
    chatInputWrapper.className = "chat-input-wrapper";

    const textarea = document.createElement("textarea");
    textarea.id = "userInput";
    textarea.className = "chat-input";
    textarea.placeholder = "Type a message or paste an image...";
    textarea.rows = 1;

    const button = document.createElement("button");
    button.id = "sendButton";
    button.className = "send-button";
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
    button.disabled = true;

    const uploadButton = document.createElement("button");
    uploadButton.className = "upload-button";
    uploadButton.type = "button";
    uploadButton.title = "Upload image";
    uploadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;

    chatInputWrapper.appendChild(uploadButton);
    chatInputWrapper.appendChild(textarea);
    chatInputWrapper.appendChild(button);

    chatInputContainer.appendChild(chatInputWrapper);
  }

  const currentUserInput = document.getElementById("userInput") || userInput;
  const currentSendButton = document.getElementById("sendButton") || sendButton;
  const uploadButton = document.querySelector(".upload-button");

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  const imagePreviewContainer = document.createElement("div");
  imagePreviewContainer.className = "image-preview-container";
  imagePreviewContainer.style.display = "none";
  imagePreviewContainer.style.margin = "0";
  imagePreviewContainer.style.padding = "0";
  imagePreviewContainer.style.height = "0";
  imagePreviewContainer.style.overflow = "hidden";

  if (chatInputContainer) {
    chatInputContainer.insertBefore(imagePreviewContainer, chatInputContainer.firstChild);
  }

  let markdownParser;
  let marked = window.marked;
  let hljs = window.hljs;
  let katex = window.katex;

  if (typeof marked !== 'undefined') {
    if (typeof marked === 'function') {
      markdownParser = marked;
    } else if (marked && typeof marked.parse === 'function') {
      markdownParser = marked.parse;
    }
  }

  if (!markdownParser) {
    markdownParser = (text) => `<p>${text}</p>`;
  }

  if (typeof marked !== 'undefined' && typeof marked.setOptions === 'function') {
    marked.setOptions({
      highlight: (code, lang) => {
        if (typeof hljs !== 'undefined') {
          if (lang && hljs.getLanguage(lang)) {
            try { return hljs.highlight(code, { language: lang }).value; } 
            catch (err) {}
          }
          return hljs.highlightAuto(code).value;
        }
        return code;
      },
      breaks: true,
      gfm: true,
    });
  }

  function renderMarkdown(content) {

    if (typeof markdownParser !== 'function') {
      return `<p>${content}</p>`;
    }

    let processedContent = content;
    const mathExpressions = [];

    if (typeof katex !== 'undefined') {
      processedContent = processedContent.replace(/\$\$([\s\S]+?)\$\$/g, (match, p1) => {
        const placeholder = `MATH_DISPLAY_${mathExpressions.length}`;
        mathExpressions.push({ placeholder, content: match, type: 'display' });
        return placeholder;
      });

      processedContent = processedContent.replace(/(?<!\S)\$(?!\s)((?:\\.|[^$\\])+?)\$(?!\d)/g, (match, p1) => {
        const placeholder = `MATH_INLINE_${mathExpressions.length}`;
        mathExpressions.push({ placeholder, content: match, type: 'inline' });
        return placeholder;
      });
    }

    let html = markdownParser(processedContent);

    if (typeof katex !== 'undefined') {
      mathExpressions.forEach(({ placeholder, content, type }) => {
        if (type === 'display') {
          try {
            const mathContent = content.slice(2, -2).trim();
            const rendered = `<div class="katex-display">${katex.renderToString(mathContent, { 
              displayMode: true,
              throwOnError: false,
              trust: true,
              strict: false
            })}</div>`;
            html = html.replace(placeholder, rendered);
          } catch (e) {
            html = html.replace(placeholder, `<div class="katex-error">${content}</div>`);
          }
        } else {
          try {
            const mathContent = content.slice(1, -1).trim();
            const rendered = katex.renderToString(mathContent, { 
              displayMode: false,
              throwOnError: false,
              trust: true,
              strict: false
            });
            html = html.replace(placeholder, rendered);
          } catch (e) {
            html = html.replace(placeholder, `<span class="katex-error">${content}</span>`);
          }
        }
      });
    }

    const temp = document.createElement("div");
    temp.innerHTML = html;

    const preBlocks = temp.querySelectorAll("pre");
    preBlocks.forEach((pre) => {
      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(createCopyButton(pre));
    });

    return temp.innerHTML;
  }

  window.renderMarkdown = renderMarkdown;

  const messages = [
    { role: "assistant", content: "Hello! I'm an AI assistant here to help you. How may I assist you today?" },
  ];

  let isWaitingForResponse = false;
  let selectedImage = null;

  window.selectedImage = selectedImage;

  if (uploadButton) {
    uploadButton.addEventListener("click", () => {
      fileInput.click();
    });
  }

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        if (file.size > 6 * 1024 * 1024) {
          throw new Error("Image is too large. Please select an image under 6MB.");
        }

        selectedImage = file;
        window.selectedImage = selectedImage;
        displayImagePreview(file);
      } catch (error) {
        alert(error.message || "Error processing image. Please try again with a different image.");
        selectedImage = null;
        window.selectedImage = null;
        fileInput.value = "";
      }
    }
  });

  function displayImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imagePreviewContainer.style.height = "auto";
        imagePreviewContainer.style.margin = "0 0 12px 0";
        imagePreviewContainer.style.padding = "0";
        imagePreviewContainer.style.display = "block";

        imagePreviewContainer.innerHTML = `
          <div class="image-preview">
            <img src="${e.target.result}" alt="Preview" 
                 style="max-width: 220px; max-height: 160px; min-width: 80px; min-height: 80px;">
            <button class="remove-image-btn">×</button>
            <div class="image-info">${file.name.substring(0, 20)}${file.name.length > 20 ? '...' : ''}</div>
          </div>
        `;

        const removeBtn = imagePreviewContainer.querySelector(".remove-image-btn");
        removeBtn.addEventListener("click", () => {
          imagePreviewContainer.style.display = "none";
          imagePreviewContainer.style.height = "0";
          imagePreviewContainer.style.margin = "0";
          imagePreviewContainer.innerHTML = "";
          selectedImage = null;
          window.selectedImage = null;
          fileInput.value = "";
          updateSendButtonState();
        });

        updateSendButtonState();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function processImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");

          let width = img.width;
          let height = img.height;
          const maxDimension = 800;

          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

          const base64Data = dataUrl.split(",")[1];
          if (base64Data.length > 5 * 1024 * 1024) {
            const moreCompressedDataUrl = canvas.toDataURL("image/jpeg", 0.6);
            resolve(moreCompressedDataUrl);
            return;
          }

          resolve(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  window.processImage = processImage;

  if (currentUserInput) {
    currentUserInput.addEventListener("input", () => {
      currentUserInput.style.height = "auto";
      currentUserInput.style.height = `${Math.min(currentUserInput.scrollHeight, 200)}px`;
      updateSendButtonState();
    });

    currentUserInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (currentSendButton && !currentSendButton.disabled) {
          sendMessage();
        }
      }
    });
  }

  if (currentSendButton) {
    currentSendButton.addEventListener("click", sendMessage);
  }

  function updateSendButtonState() {
    if (!currentUserInput || !currentSendButton) return;

    const isEmpty = currentUserInput.value.trim() === "" && !selectedImage;
    if (isEmpty || isWaitingForResponse) {
      currentSendButton.setAttribute('disabled', 'disabled');
      currentSendButton.disabled = true;
    } else {
      currentSendButton.removeAttribute('disabled');
      currentSendButton.disabled = false;
    }
  }

  async function sendMessage() {
    if (!currentUserInput) return;

    const userMessage = currentUserInput.value.trim();
    if ((userMessage === "" && !selectedImage) || isWaitingForResponse) return;

    try {

      const messagesCount = document.querySelectorAll('.message').length;
      if (messagesCount <= 1) {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer && chatContainer.classList.contains('collapsed')) {
          chatContainer.classList.remove('collapsed');
        }
      }

      isWaitingForResponse = true;
      updateSendButtonState();

      let displayContent = userMessage;
      let apiMessage = { role: "user", content: userMessage };
      let imageUrl = null;

      if (selectedImage) {
        const imageDataUrl = await processImage(selectedImage);
        displayContent = userMessage || "What's in this image?";
        imageUrl = imageDataUrl;

        addMessageToUI("user", displayContent, imageUrl);
        if (typeof window.updateCurrentChat === 'function') {
          window.updateCurrentChat("user", displayContent, imageUrl);
        }

        apiMessage.attachments = [{
          type: "image",
          data: imageDataUrl
        }];

        imagePreviewContainer.style.display = "none";
        imagePreviewContainer.innerHTML = "";
        selectedImage = null;
        window.selectedImage = null;
        fileInput.value = "";
      } else {
        addMessageToUI("user", userMessage);
        if (typeof window.updateCurrentChat === 'function') {
          window.updateCurrentChat("user", userMessage);
        }
      }

      currentUserInput.value = "";
      currentUserInput.style.height = "auto";

      const aiMessageElement = addThinkingIndicator();

      await fetchAIResponse(apiMessage, aiMessageElement);
    } catch (error) {
      console.error("Error in sendMessage:", error);
      addMessageToUI("assistant", "Sorry, there was an error sending your message. Please try again.");
    } finally {
      isWaitingForResponse = false;
      updateSendButtonState();
      if (currentUserInput) {
        currentUserInput.focus();
      }
    }
  }

  window.sendMessage = sendMessage;

  function createCopyButton(codeBlock) {
    const button = document.createElement("button");
    button.className = "copy-button";
    button.textContent = "Copy";

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(codeBlock.textContent);
        button.textContent = "Copied!";
        button.classList.add("copied");
        setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("copied");
        }, 2000);
      } catch (err) {}
    });

    return button;
  }

  function addMessageToUI(role, content, imageUrl = null) {
    try {
      const messageDiv = document.createElement("div");
      messageDiv.className = `message ${role}-message`;

      const avatarDiv = document.createElement("div");
      avatarDiv.className = "message-avatar";

      const avatarSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      avatarSvg.setAttribute("width", "24");
      avatarSvg.setAttribute("height", "24");
      avatarSvg.setAttribute("viewBox", "0 0 24 24");
      avatarSvg.setAttribute("fill", "none");
      avatarSvg.setAttribute("stroke", "currentColor");
      avatarSvg.setAttribute("stroke-width", "2");
      avatarSvg.setAttribute("stroke-linecap", "round");
      avatarSvg.setAttribute("stroke-linejoin", "round");

      let pathElement;
      if (role === "assistant") {
        pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElement.setAttribute(
          "d",
          "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
        );
      } else {
        pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElement.setAttribute("d", "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2");

        const circleElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circleElement.setAttribute("cx", "12");
        circleElement.setAttribute("cy", "7");
        circleElement.setAttribute("r", "4");
        avatarSvg.appendChild(circleElement);
      }

      avatarSvg.appendChild(pathElement);
      avatarDiv.appendChild(avatarSvg);

      const contentDiv = document.createElement("div");
      contentDiv.className = "message-content";

      if (imageUrl) {
        contentDiv.innerHTML = `
          <div class="message-image-container">
            <img src="${imageUrl}" alt="Uploaded image" class="message-image">
          </div>
          <p>${content}</p>
        `;
      } 
      else if (typeof content === 'string' && content.includes('[Image]')) {
        const textContent = content.replace('[Image]', '').trim();
        contentDiv.innerHTML = `
          <div class="message-image-indicator">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <span>Image uploaded</span>
          </div>
          ${textContent ? `<p>${textContent}</p>` : ''}
        `;
      } else {
        contentDiv.innerHTML = role === "assistant" ? renderMarkdown(content) : `<p>${content}</p>`;
      }

      if (role === "assistant" && content.trim() !== "") {
        const isWelcomeMessage = content.includes("Hello! I'm an AI assistant here to help you. How may I assist you today?");

        if (!isWelcomeMessage) {
          const actionsDiv = document.createElement("div");
          actionsDiv.className = "ai-message-actions";

          const copyButton = document.createElement("button");
          copyButton.className = "ai-action-button copy-ai-button";
          copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          `;

          copyButton.addEventListener("click", async () => {
            try {
              const tempDiv = document.createElement('div');
              contentDiv.childNodes.forEach(node => {
                if (!node.classList || !node.classList.contains('ai-message-actions')) {
                  tempDiv.appendChild(node.cloneNode(true));
                }
              });

              await navigator.clipboard.writeText(tempDiv.innerText.trim());

              copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              `;
              copyButton.classList.add("copied");

              setTimeout(() => {
                copyButton.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                `;
                copyButton.classList.remove("copied");
              }, 2000);
            } catch (err) {}
          });

          actionsDiv.appendChild(copyButton);

          const allMessages = Array.from(chatMessages.querySelectorAll('.message.ai-message'));
          const isLatestAIMessage = allMessages.length === 0 || 
                                    allMessages[allMessages.length - 1] === messageDiv || 
                                    !chatMessages.contains(messageDiv);

          if (isLatestAIMessage) {
            const regenerateButton = document.createElement("button");
            regenerateButton.className = "ai-action-button regenerate-button";
            regenerateButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            `;

            regenerateButton.addEventListener("click", () => {
              if (!isWaitingForResponse) {
                const allMessages = Array.from(chatMessages.querySelectorAll('.message'));
                const currentIndex = allMessages.indexOf(messageDiv);

                const prevUserMessageEl = allMessages
                  .slice(0, currentIndex)
                  .reverse()
                  .find(el => el.classList.contains('user-message'));

                if (!prevUserMessageEl) return;

                const imageContainer = prevUserMessageEl.querySelector('.message-image-container');
                const imageElement = imageContainer ? imageContainer.querySelector('img') : null;

                let userMessageData;

                if (imageElement) {
                  const messageContent = prevUserMessageEl.querySelector('.message-content p');
                  const textContent = messageContent ? messageContent.textContent.trim() : "";

                  userMessageData = {
                    role: "user",
                    content: textContent || "What's in this image?",
                    attachments: [{
                      type: "image",
                      data: imageElement.src
                    }]
                  };
                } else {
                  const messageContent = prevUserMessageEl.querySelector('.message-content');
                  const textContent = messageContent ? messageContent.textContent.trim() : "";

                  userMessageData = {
                    role: "user",
                    content: textContent
                  };
                }

                messageDiv.remove();

                for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].role === "assistant") {
                    messages.splice(i, 1);
                    break;
                  }
                }

                isWaitingForResponse = true;
                updateSendButtonState();

                const aiMessageElement = addThinkingIndicator();
                fetchAIResponse(userMessageData, aiMessageElement);
              }
            });

            actionsDiv.appendChild(regenerateButton);
          }

          contentDiv.appendChild(actionsDiv);
        }
      }

      if (role === "user") {
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(avatarDiv);
      } else {
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
      }

      chatMessages.appendChild(messageDiv);

      if (typeof hljs !== 'undefined') {
        messageDiv.querySelectorAll("pre code").forEach((block) => {
          hljs.highlightElement(block);
        });
      }

      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: "smooth",
      });

      return messageDiv;
    } catch (error) {
      console.error("Error in addMessageToUI:", error);
      const errorDiv = document.createElement("div");
      errorDiv.className = `message ${role}-message`;
      errorDiv.textContent = "Error displaying message";
      chatMessages.appendChild(errorDiv);
      return errorDiv;
    }
  }

  window.addMessageToUI = addMessageToUI;

  function addThinkingIndicator() {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message ai-message";

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "message-avatar";

    const avatarSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    avatarSvg.setAttribute("width", "24");
    avatarSvg.setAttribute("height", "24");
    avatarSvg.setAttribute("viewBox", "0 0 24 24");
    avatarSvg.setAttribute("fill", "none");
    avatarSvg.setAttribute("stroke", "currentColor");
    avatarSvg.setAttribute("stroke-width", "2");
    avatarSvg.setAttribute("stroke-linecap", "round");
    avatarSvg.setAttribute("stroke-linejoin", "round");

    const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathElement.setAttribute(
      "d",
      "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
    );
    avatarSvg.appendChild(pathElement);
    avatarDiv.appendChild(avatarSvg);

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    const thinkingDiv = document.createElement("div");
    thinkingDiv.className = "thinking";

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("div");
      dot.className = "thinking-dot";
      thinkingDiv.appendChild(dot);
    }

    contentDiv.appendChild(thinkingDiv);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageDiv;
  }

  function extractMessagesFromDOM() {
    const extractedMessages = [];
    const messageElements = document.querySelectorAll("#chatMessages .message");
    messageElements.forEach(msgEl => {

        const role = msgEl.classList.contains("ai-message") ? "assistant" : "user";
        const contentEl = msgEl.querySelector(".message-content");

        const content = contentEl ? contentEl.innerText.trim() : "";
        extractedMessages.push({ role, content });
    });
    return extractedMessages;
  }

  async function fetchAIResponse(apiMessage, aiMessageElement) {
    try {
      let apiMessages = extractMessagesFromDOM();

      if (typeof apiMessage === 'object' && apiMessage.content) {
        apiMessages.push(apiMessage);
      } else {
        apiMessages.push({ role: "user", content: apiMessage });
      }

      const hasAttachment = !!(apiMessage.attachments && apiMessage.attachments.length > 0);

      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: apiMessages,
          hasAttachment: hasAttachment
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentDiv = aiMessageElement.querySelector(".message-content");
      contentDiv.innerHTML = "";
      const streamingText = document.createElement('div');
      streamingText.style.whiteSpace = 'pre-wrap';
      contentDiv.appendChild(streamingText);

      let aiResponse = "";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        buffer += text;
        let lines = buffer.split("\n");
        buffer = lines.pop(); 
        let shouldBreak = false;
        for (let line of lines) {
          console.log("Received SSE line:", line);
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (!data) continue;
            if (data === '[DONE]') {
              shouldBreak = true;
              break;
            }
            try {
              const parsedData = JSON.parse(data);
              if (
                parsedData.choices &&
                parsedData.choices[0].delta &&
                parsedData.choices[0].delta.content !== undefined
              ) {
                const content = parsedData.choices[0].delta.content;
                aiResponse += content;
                streamingText.textContent = aiResponse;
                streamingText.scrollTop = streamingText.scrollHeight;
              }
            } catch (e) {
              console.error("Error parsing SSE data. Data:", data, e);
            }
          }
        }
        if (shouldBreak) break;
      }
      const trimmedBuffer = buffer.trim();
      if (trimmedBuffer) {
        try {
          const remainingData = JSON.parse(trimmedBuffer);
          if (
            remainingData.choices &&
            remainingData.choices[0].delta &&
            remainingData.choices[0].delta.content !== undefined
          ) {
            const content = remainingData.choices[0].delta.content;
            aiResponse += content;
            streamingText.textContent = aiResponse;
            streamingText.scrollTop = streamingText.scrollHeight;
          }
        } catch (e) {
          console.warn("Error parsing remaining buffer, ignoring:", e);
        }
      }

      const titleMatch = aiResponse.match(/<chat-title>(.*?)<\/chat-title>/);
      if (titleMatch && titleMatch[1]) {
        const newTitle = titleMatch[1].trim();
        if (typeof window.updateChatTitle === 'function') {
          window.updateChatTitle(newTitle);
        }

        aiResponse = aiResponse.replace(/<chat-title>.*?<\/chat-title>/g, '');
      }

      contentDiv.innerHTML = renderMarkdown(aiResponse);
      if (typeof hljs !== 'undefined') {
        contentDiv.querySelectorAll("pre code").forEach((block) => {
          hljs.highlightElement(block);
        });
      }

      if (typeof window.updateCurrentChat === 'function') {
        window.updateCurrentChat("assistant", aiResponse);
      }

      return aiResponse;
    } catch (error) {
      console.error("Error in fetchAIResponse:", error);
      const contentDiv = aiMessageElement.querySelector(".message-content");
      contentDiv.innerHTML = renderMarkdown("❌ Sorry, there was an error processing your request. Please try again.");
      return "Error processing request";
    } finally {
      isWaitingForResponse = false;
      updateSendButtonState();
    }
  }

  window.fetchAIResponse = fetchAIResponse;

  function initializeActionButtons() {
    const aiMessages = document.querySelectorAll('.message.ai-message');
    let lastValidAIMessage = null;

    for (let i = aiMessages.length - 1; i >= 0; i--) {
      const messageDiv = aiMessages[i];
      const contentDiv = messageDiv.querySelector('.message-content');
      const messageContent = contentDiv.textContent.trim();

      if (messageContent === "" || 
          messageContent.includes("Hello! I'm an AI assistant here to help you. How may I assist you today?")) {
        continue;
      }

      lastValidAIMessage = messageDiv;
      break;
    }

    aiMessages.forEach((messageDiv) => {
      const contentDiv = messageDiv.querySelector('.message-content');
      const existingActions = contentDiv.querySelector('.ai-message-actions');
      const messageContent = contentDiv.textContent.trim();

      if (existingActions) {
        existingActions.remove();
      }

      if (messageContent === "" || 
          messageContent.includes("Hello! I'm an AI assistant here to help you. How may I assist you today?")) {
        return;
      }

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "ai-message-actions";

      const copyButton = document.createElement("button");
      copyButton.className = "ai-action-button copy-ai-button";
      copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy
      `;

      copyButton.addEventListener("click", async () => {
        try {
          const tempDiv = document.createElement('div');
          contentDiv.childNodes.forEach(node => {
            if (!node.classList || !node.classList.contains('ai-message-actions')) {
              tempDiv.appendChild(node.cloneNode(true));
            }
          });

          await navigator.clipboard.writeText(tempDiv.innerText.trim());

          copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          `;
          copyButton.classList.add("copied");

          setTimeout(() => {
            copyButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            `;
            copyButton.classList.remove("copied");
          }, 2000);
        } catch (err) {}
      });

      actionsDiv.appendChild(copyButton);

      if (messageDiv === lastValidAIMessage) {
        const regenerateButton = document.createElement("button");
        regenerateButton.className = "ai-action-button regenerate-button";
        regenerateButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Regenerate
        `;

        regenerateButton.addEventListener("click", () => {
          if (!isWaitingForResponse) {
            const allMessages = Array.from(chatMessages.querySelectorAll('.message'));
            const currentIndex = allMessages.indexOf(messageDiv);

            const prevUserMessageEl = allMessages
              .slice(0, currentIndex)
              .reverse()
              .find(el => el.classList.contains('user-message'));

            if (!prevUserMessageEl) return;

            const imageContainer = prevUserMessageEl.querySelector('.message-image-container');
            const imageElement = imageContainer ? imageContainer.querySelector('img') : null;

            let userMessageData;

            if (imageElement) {
              const messageContent = prevUserMessageEl.querySelector('.message-content p');
              const textContent = messageContent ? messageContent.textContent.trim() : "";

              userMessageData = {
                role: "user",
                content: textContent || "What's in this image?",
                attachments: [{
                  type: "image",
                  data: imageElement.src
                }]
              };
            } else {
              const messageContent = prevUserMessageEl.querySelector('.message-content');
              const textContent = messageContent ? messageContent.textContent.trim() : "";

              userMessageData = {
                role: "user",
                content: textContent
              };
            }

            messageDiv.remove();

            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i].role === "assistant") {
                messages.splice(i, 1);
                break;
              }
            }

            isWaitingForResponse = true;
            updateSendButtonState();

            const aiMessageElement = addThinkingIndicator();
            fetchAIResponse(userMessageData, aiMessageElement);
          }
        });

        actionsDiv.appendChild(regenerateButton);
      }

      contentDiv.appendChild(actionsDiv);
    });
  }

  if (currentUserInput) {
    currentUserInput.addEventListener("paste", async (e) => {
      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            e.preventDefault();

            const file = items[i].getAsFile();

            try {
              if (file.size > 6 * 1024 * 1024) {
                throw new Error("Image is too large. Please select an image under 6MB.");
              }

              selectedImage = file;
              window.selectedImage = selectedImage;
              displayImagePreview(file);
              setTimeout(() => currentUserInput.focus(), 100);
            } catch (error) {
              alert(error.message || "Error processing image. Please try again with a different image.");
              selectedImage = null;
              window.selectedImage = null;
            }
            break;
          }
        }
      }
    });
  }

  const homeLink = document.querySelector('a[href="/"]');
  if (homeLink) homeLink.href = "/";

  updateSendButtonState();
  if (currentUserInput) {
    currentUserInput.focus();
  }
  initializeActionButtons();
  ensureMessageStyling();
});

function applyMessageStyling(content, type) {
  if (type === 'ai') {
    content.style.background = 'rgba(30, 41, 59, 0.5)';
    content.style.border = '1px solid rgba(255, 255, 255, 0.05)';
    content.style.borderTopLeftRadius = '0';
    content.style.borderBottomLeftRadius = '12px';
    content.style.borderTopRightRadius = '12px';
    content.style.borderBottomRightRadius = '12px';
  } else if (type === 'user') {
    content.style.background = 'rgba(99, 102, 241, 0.2)';
    content.style.border = '1px solid rgba(99, 102, 241, 0.1)';
    content.style.borderTopRightRadius = '0';
    content.style.borderBottomRightRadius = '12px';
    content.style.borderTopLeftRadius = '12px';
    content.style.borderBottomLeftRadius = '12px';
  }

  const imageContainer = content.querySelector('.message-image-container');
  if (imageContainer) {
    imageContainer.style.backgroundColor = 'transparent';
    const image = imageContainer.querySelector('.message-image');
    if (image) {
      image.style.maxWidth = '100%';
      image.style.maxHeight = '300px';
      image.style.borderRadius = '8px';
      image.style.border = (type === 'ai')
        ? '1px solid rgba(255, 255, 255, 0.1)'
        : '1px solid rgba(99, 102, 241, 0.1)';
      image.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    }
  }
}

function ensureMessageStyling() {
  console.log("Applying message styling to all messages");
  document.querySelectorAll('.message-content').forEach(content => {
    const parentMessage = content.closest('.message');
    if (!parentMessage) return;
    if (parentMessage.classList.contains('ai-message')) {
      applyMessageStyling(content, 'ai');
    } else if (parentMessage.classList.contains('user-message')) {
      applyMessageStyling(content, 'user');
    }
  });

  window.ensureMessageStyling = ensureMessageStyling;
}

function forceApplyMessageStyling() {
  console.log("Force applying message styling");
  ensureMessageStyling();
}

window.forceApplyMessageStyling = forceApplyMessageStyling;

document.addEventListener("DOMContentLoaded", () => {

  ensureMessageStyling();
  forceApplyMessageStyling();

  const chatMessagesElement = document.getElementById("chatMessages");
  if (chatMessagesElement) {
    const observer = new MutationObserver((mutations) => {
      let needsStyling = false;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          needsStyling = true;
        }
      });
      if (needsStyling) {
        ensureMessageStyling();
      }
    });

    observer.observe(chatMessagesElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  setInterval(forceApplyMessageStyling, 1000);
});