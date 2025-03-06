const appsGrid = document.getElementById('appsGrid');
const searchInput = document.getElementById('searchInput');
const categoryButtons = document.querySelectorAll('.category-btn');
const errorMessage = document.getElementById('errorMessage');
const retryButton = document.getElementById('retryButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const backButton = document.getElementById('backButton');
const iframe = document.getElementById('iframeWindow');
const mainContent = document.getElementById('mainContent');
const navbar = document.querySelector('.navbar');

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
const bareUrl = (location.protocol === "https:" ? "https" : "http") + "://" + location.host + "/bare/";

let hiddenUrlInput;
if (!document.getElementById('hiddenUrlInput')) {
  hiddenUrlInput = document.createElement('input');
  hiddenUrlInput.id = 'hiddenUrlInput';
  hiddenUrlInput.type = 'text';
  hiddenUrlInput.style.position = 'absolute';
  hiddenUrlInput.style.opacity = '0';
  hiddenUrlInput.style.pointerEvents = 'none';
  document.body.appendChild(hiddenUrlInput);
  
  hiddenUrlInput.addEventListener('keydown', async function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      
      try {
        let url = hiddenUrlInput.value;
        const searchUrl = "https://www.google.com/search?q=";
        console.log("Raw URL input:", url);

        if (!url.includes(".")) {
            url = searchUrl + encodeURIComponent(url);
            console.log("No period found. Using Google search. New URL:", url);
        } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
            console.log("Protocol missing. Prepending https://. New URL:", url);
        }

        if (!await connection.getTransport()) {
            console.log("Transport not set. Setting transport now...");
            await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
        }
    
        if (typeof __uv$config === "undefined") {
            console.error("__uv$config is undefined. Check that uv.config.js loads correctly.");
            return;
        }
  
        const proxiedUrl = __uv$config.prefix + __uv$config.encodeUrl(url);
        console.log("Setting iframe src to:", proxiedUrl);
        iframe.src = proxiedUrl;
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.zIndex = '320';
        iframe.style.display = 'block';
  
        const existingLoadingFrame = document.getElementById("loadingFrame");
        if (existingLoadingFrame) {
            existingLoadingFrame.parentElement.removeChild(existingLoadingFrame);
        }
    
        const loadingFrame = document.createElement("iframe");
        loadingFrame.id = "loadingFrame";
        loadingFrame.src = "/loading";
        loadingFrame.style.position = "fixed";
        loadingFrame.style.top = "0";
        loadingFrame.style.left = "0";
        loadingFrame.style.width = "100vw";
        loadingFrame.style.height = "100vh";
        loadingFrame.style.zIndex = "310"; 
        loadingFrame.style.border = "none";
        document.body.appendChild(loadingFrame);

        setTimeout(() => {
            const lf = document.getElementById("loadingFrame");
            if (lf && lf.parentElement) {
                lf.parentElement.removeChild(lf);
            }
        }, 10000);
      } catch (error) {
        console.error('Error loading URL:', error);
        alert('An error occurred while loading the app. Please try again.');
      }
    }
  });
} else {
  hiddenUrlInput = document.getElementById('hiddenUrlInput');
}

async function loadApp(url) {
  loadingIndicator.style.display = 'flex';
  
  try {
    backButton.style.display = 'flex';
    backButton.style.zIndex = '999'; 
    
    hiddenUrlInput.value = url;
    
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      bubbles: true,
      cancelable: true
    });
    hiddenUrlInput.dispatchEvent(enterEvent);
    
    iframe.onload = () => {
      loadingIndicator.style.display = 'none';
      mainContent.style.display = 'none';
      navbar.style.display = 'none';
    };
  } catch (error) {
    console.error('Error loading app:', error);
    loadingIndicator.style.display = 'none';
    alert('An error occurred while loading the app. Please try again.');
  }
}

let apps = [];
let currentCategory = 'all';
let searchTerm = '';

function createAppCard(app) {
  const card = document.createElement('div');
  card.className = 'app-card';
  card.setAttribute('data-category', app.category);
  
  card.innerHTML = `
    <img src="${app.icon}" alt="${app.name}" class="app-icon">
    <h3 class="app-name">${app.name}</h3>
    <span class="app-category">${app.category}</span>
  `;
  
  card.addEventListener('click', () => loadApp(app.url));
  return card;
}

function filterApps() {
  const filteredApps = apps.filter(app => {
    const matchesCategory = currentCategory === 'all' || (app.category && app.category.toLowerCase() === currentCategory.toLowerCase());
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  renderApps(filteredApps);
}

function renderApps(appsToRender) {
  appsGrid.innerHTML = '';
  
  if (appsToRender.length === 0) {
    appsGrid.innerHTML = `
      <div class="error-message">
        <p>No apps found matching your criteria.</p>
      </div>
    `;
    return;
  }
  
  appsToRender.forEach(app => {
    appsGrid.appendChild(createAppCard(app));
  });
  
  const cards = appsGrid.querySelectorAll('.app-card');
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.add('animate-in');
    }, index * 100); 
  });
}

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  filterApps();
});

categoryButtons.forEach(button => {
  button.addEventListener('click', () => {
    categoryButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    currentCategory = button.dataset.category;
    filterApps();
  });
});

backButton.addEventListener('click', function() {
  console.log("Back button clicked - reloading page");
  window.location.reload();
});

retryButton.addEventListener('click', initializeApps);

async function initializeApps() {
  errorMessage.style.display = 'none';
  
  try {
    const response = await fetch('/api/games');
    if (!response.ok) throw new Error('Failed to fetch apps');
    apps = await response.json();
    
    filterApps();
  } catch (error) {
    console.error('Error fetching apps:', error);
    errorMessage.style.display = 'flex';
  }
}

initializeApps();