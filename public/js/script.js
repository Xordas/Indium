const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
const bareUrl = (location.protocol === "https:" ? "https" : "http") + "://" + location.host + "/bare/";

const iframeWindow = document.getElementById("iframeWindow");
const backButton = document.getElementById("backButton");

document.getElementById("urlInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("searchButton").click();
    }
});

document.getElementById("searchButton").onclick = async function (event) {
    event.preventDefault();
    
    try {
        let url = document.getElementById("urlInput").value;
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
        
        iframeWindow.style.position = "fixed";
        iframeWindow.style.top = "0";
        iframeWindow.style.left = "0";
        iframeWindow.style.width = "100vw";
        iframeWindow.style.height = "100vh";
        iframeWindow.style.zIndex = "320";  
        iframeWindow.src = proxiedUrl;
        iframeWindow.style.display = "block";
    
        document.getElementById("mainContent").style.display = "none";
        
        backButton.style.display = "flex";
    
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
        console.error("Error in search handler:", error);
    }
};

backButton.addEventListener("click", function () {
    iframeWindow.style.display = "none";
    document.getElementById("mainContent").style.display = "flex";
    backButton.style.display = "none";
    const existingLoadingFrame = document.getElementById("loadingFrame");
    if (existingLoadingFrame) {
        existingLoadingFrame.parentElement.removeChild(existingLoadingFrame);
    }
    iframeWindow.src = "about:blank";
    document.getElementById("urlInput").value = "";
});

document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", function (e) {
        if (this.getAttribute("href").startsWith("#")) {
            e.preventDefault();
            const targetId = this.getAttribute("href").substring(1);
            const targetElement = document.getElementById(targetId);
  
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: "smooth",
                });
            }
  
            const navLinks = document.getElementById("navLinks");
            const menuToggle = document.getElementById("menuToggle");
            if (navLinks.classList.contains("active")) {
                navLinks.classList.remove("active");
                menuToggle.classList.remove("active");
            }
        }
    });
});