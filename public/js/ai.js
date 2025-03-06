document.addEventListener("DOMContentLoaded", () => {
  const chatMessages = document.getElementById("chatMessages")
  const userInput = document.getElementById("userInput")
  const sendButton = document.getElementById("sendButton")

  let markdownParser;
  if (typeof marked === 'function') {
    markdownParser = marked;
  } else if (marked && typeof marked.parse === 'function') {
    markdownParser = marked.parse;
  } else {
    console.error("Marked library not properly loaded");
    markdownParser = (text) => `<p>${text}</p>`;
  }

  if (typeof marked.setOptions === 'function') {
    marked.setOptions({
      highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value
          } catch (err) {}
        }
        return hljs.highlightAuto(code).value
      },
      breaks: true,
      gfm: true,
    })
  }

  const messages = [
    { role: "assistant", content: "Hello! I'm Llama, an AI assistant developed by Meta. How can I help you today?" },
  ]

  let isWaitingForResponse = false

  userInput.addEventListener("input", (e) => {
    userInput.style.height = "auto"
    userInput.style.height = `${Math.min(userInput.scrollHeight, 200)}px`

    updateSendButtonState()
  })

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!sendButton.disabled) {
        sendMessage()
      }
    }
  })

  sendButton.addEventListener("click", sendMessage)

  function updateSendButtonState() {
    const isEmpty = userInput.value.trim() === ""
    
    if (isEmpty || isWaitingForResponse) {
      sendButton.setAttribute('disabled', 'disabled');
    } else {
      sendButton.removeAttribute('disabled');
    }
    
    console.log("Send button state updated:", { 
      isEmpty, 
      isWaitingForResponse, 
      hasAttribute: sendButton.hasAttribute('disabled'),
      value: userInput.value
    })
  }

  async function sendMessage() {
    const userMessage = userInput.value.trim()
    if (userMessage === "" || isWaitingForResponse) return

    try {
      const messagesCount = document.querySelectorAll('.message').length;
      if (messagesCount <= 1) {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer && chatContainer.classList.contains('collapsed')) {
          chatContainer.classList.remove('collapsed');
        }
      }
      
      isWaitingForResponse = true
      updateSendButtonState()

      addMessageToUI("user", userMessage)
      messages.push({ role: "user", content: userMessage })
      
      userInput.value = ""
      userInput.style.height = "auto"
      
      const aiMessageElement = addThinkingIndicator()

      await fetchAIResponse(messages, aiMessageElement)
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage = "Sorry, there was an error sending your message. Please try again."
      addMessageToUI("assistant", errorMessage)
    } finally {
      isWaitingForResponse = false
      updateSendButtonState()
      userInput.focus()
    }
  }

  function createCopyButton(codeBlock) {
    const button = document.createElement("button")
    button.className = "copy-button"
    button.textContent = "Copy"

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(codeBlock.textContent)
        button.textContent = "Copied!"
        button.classList.add("copied")
        setTimeout(() => {
          button.textContent = "Copy"
          button.classList.remove("copied")
        }, 2000)
      } catch (err) {
        console.error("Failed to copy text:", err)
      }
    })

    return button
  }

  function renderMarkdown(content) {
    const html = markdownParser(content);

    const temp = document.createElement("div")
    temp.innerHTML = html

    const preBlocks = temp.querySelectorAll("pre")
    preBlocks.forEach((pre) => {
      const wrapper = document.createElement("div")
      wrapper.className = "code-block-wrapper"
      pre.parentNode.insertBefore(wrapper, pre)
      wrapper.appendChild(pre)

      const copyButton = createCopyButton(pre)
      wrapper.appendChild(copyButton)
    })

    return temp.innerHTML
  }

  function addMessageToUI(role, content) {
    try {
      const messageDiv = document.createElement("div")
      messageDiv.className = `message ${role}-message`

      const avatarDiv = document.createElement("div")
      avatarDiv.className = "message-avatar"
      
      const avatarSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      avatarSvg.setAttribute("width", "24")
      avatarSvg.setAttribute("height", "24")
      avatarSvg.setAttribute("viewBox", "0 0 24 24")
      avatarSvg.setAttribute("fill", "none")
      avatarSvg.setAttribute("stroke", "currentColor")
      avatarSvg.setAttribute("stroke-width", "2")
      avatarSvg.setAttribute("stroke-linecap", "round")
      avatarSvg.setAttribute("stroke-linejoin", "round")

      let pathElement
      if (role === "assistant") {
        pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path")
        pathElement.setAttribute(
          "d",
          "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
        )
      } else {
        pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path")
        pathElement.setAttribute("d", "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2")

        const circleElement = document.createElementNS("http://www.w3.org/2000/svg", "circle")
        circleElement.setAttribute("cx", "12")
        circleElement.setAttribute("cy", "7")
        circleElement.setAttribute("r", "4")
        avatarSvg.appendChild(circleElement)
      }

      avatarSvg.appendChild(pathElement)
      avatarDiv.appendChild(avatarSvg)

      const contentDiv = document.createElement("div")
      contentDiv.className = "message-content"
      
      contentDiv.innerHTML = role === "assistant" ? renderMarkdown(content) : `<p>${content}</p>`

      if (role === "user") {
        messageDiv.appendChild(contentDiv)
        messageDiv.appendChild(avatarDiv)
      } else {
        messageDiv.appendChild(avatarDiv)
        messageDiv.appendChild(contentDiv)
      }

      chatMessages.appendChild(messageDiv)

      messageDiv.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block)
      })

      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: "smooth",
      })

      return messageDiv
    } catch (error) {
      console.error("Error adding message to UI:", error)
      const errorDiv = document.createElement("div")
      errorDiv.className = `message ${role}-message`
      errorDiv.textContent = "Error displaying message"
      chatMessages.appendChild(errorDiv)
      return errorDiv
    }
  }

  function addThinkingIndicator() {
    const messageDiv = document.createElement("div")
    messageDiv.className = "message ai-message"

    const avatarDiv = document.createElement("div")
    avatarDiv.className = "message-avatar"

    const avatarSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    avatarSvg.setAttribute("width", "24")
    avatarSvg.setAttribute("height", "24")
    avatarSvg.setAttribute("viewBox", "0 0 24 24")
    avatarSvg.setAttribute("fill", "none")
    avatarSvg.setAttribute("stroke", "currentColor")
    avatarSvg.setAttribute("stroke-width", "2")
    avatarSvg.setAttribute("stroke-linecap", "round")
    avatarSvg.setAttribute("stroke-linejoin", "round")

    const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path")
    pathElement.setAttribute(
      "d",
      "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
    )
    avatarSvg.appendChild(pathElement)
    avatarDiv.appendChild(avatarSvg)

    const contentDiv = document.createElement("div")
    contentDiv.className = "message-content"

    const thinkingDiv = document.createElement("div")
    thinkingDiv.className = "thinking"

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("div")
      dot.className = "thinking-dot"
      thinkingDiv.appendChild(dot)
    }

    contentDiv.appendChild(thinkingDiv)

    messageDiv.appendChild(avatarDiv)
    messageDiv.appendChild(contentDiv)

    chatMessages.appendChild(messageDiv)

    chatMessages.scrollTop = chatMessages.scrollHeight

    return messageDiv
  }

  async function fetchAIResponse(messages, aiMessageElement) {
    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ""

      const contentDiv = aiMessageElement.querySelector(".message-content")
      contentDiv.innerHTML = ""

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.substring(6))
              if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                const content = data.choices[0].delta.content
                aiResponse += content
                contentDiv.innerHTML = renderMarkdown(aiResponse)

                contentDiv.querySelectorAll("pre code").forEach((block) => {
                  hljs.highlightElement(block)
                })

                chatMessages.scrollTop = chatMessages.scrollHeight
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e)
            }
          }
        }
      }

      messages.push({ role: "assistant", content: aiResponse })
    } catch (error) {
      console.error("Error fetching AI response:", error)

      const contentDiv = aiMessageElement.querySelector(".message-content")
      contentDiv.innerHTML = renderMarkdown("❌ Sorry, there was an error processing your request. Please try again.")
    } finally {
      isWaitingForResponse = false

      sendButton.disabled = userInput.value.trim() === ""
    }
  }

  const homeLink = document.querySelector('a[href="/"]')
  if (homeLink) {
    homeLink.href = "/"
  }

  updateSendButtonState()
  
  userInput.focus()
})