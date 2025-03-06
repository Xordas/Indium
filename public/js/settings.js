if (typeof SettingsManager === 'undefined') {
  window.SettingsManager = {
    CLOAKING_OPTIONS: {
      drive: { title: 'Google Drive', favicon: 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png' },
      docs: { title: 'Google Docs', favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
      classroom: { title: 'Google Classroom', favicon: 'https://ssl.gstatic.com/classroom/favicon.png' },
      canvas: { title: 'Canvas', favicon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico' },
      powerschool: { title: 'PowerSchool', favicon: 'https://www.powerschool.com/favicon.ico' },
      gmail: { title: 'Gmail', favicon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico' },
      google: { title: 'Google', favicon: 'https://www.google.com/favicon.ico' }
    },
    resetCloak: function() {
      document.title = 'Settings - Proxy';
      const favicon = document.querySelector("link[rel='icon']");
      if (favicon) {
        favicon.href = 'favicon.ico';
      }
    },
    setCloak: function(title, favicon) {
      document.title = title;
      const faviconElement = document.querySelector("link[rel='icon']") || document.createElement('link');
      faviconElement.type = 'image/x-icon';
      faviconElement.rel = 'icon';
      faviconElement.href = favicon;
      document.head.appendChild(faviconElement);
    },
    handleTabBlur: function() {
      const selectedOption = localStorage.getItem('clickoffCloak');
      if (selectedOption) {
        const option = SettingsManager.CLOAKING_OPTIONS[selectedOption];
        SettingsManager.setCloak(option.title, option.favicon);
      }
    },
    handleTabFocus: function() {
      const currentCloak = localStorage.getItem('tabCloak');
      if (currentCloak) {
        const option = SettingsManager.CLOAKING_OPTIONS[currentCloak];
        SettingsManager.setCloak(option.title, option.favicon);
      } else {
        SettingsManager.resetCloak();
      }
    },
    handleBeforeUnload: function(e) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    },
    initializeSettings: function() {

    }
  };
}

let isCapturingKeybind = false;
let keybinds = [];

window.removeKeybind = function(index) {
  keybinds.splice(index, 1);
  localStorage.setItem('panicKeys', JSON.stringify(keybinds));
  renderKeybinds();
};

window.cancelKeybindCapture = function(button) {
  isCapturingKeybind = false;
  document.removeEventListener('keydown', captureKeybind);
  button.parentElement.remove();
};

function renderKeybinds() {
  const container = document.getElementById('keybindList');
  if (!container) return;

  container.innerHTML = keybinds.map((keybind, index) => {
    const keyParts = keybind.split('+');
    const formattedKeys = `<div class="keybind-keys-wrapper">
      ${keyParts.map(key => `<span class="keybind-key">${key}</span>`).join('')}
    </div>`;

    return `
      <div class="keybind-item">
        ${formattedKeys}
        <button class="remove-keybind" onclick="removeKeybind(${index})">Remove</button>
      </div>
    `;
  }).join('');
}

function captureKeybind(e) {
  if (!isCapturingKeybind) return;
  e.preventDefault();

  const keys = [];
  if (e.ctrlKey) keys.push('ctrl');
  if (e.altKey) keys.push('alt');
  if (e.shiftKey) keys.push('shift');
  if (!['Control', 'Alt', 'Shift'].includes(e.key)) {
    keys.push(e.key.toLowerCase());
  }

  if (keys.length > 0 && !['Control', 'Alt', 'Shift'].includes(e.key)) {
    const keybind = keys.join('+');
    addKeybind(keybind);
    document.removeEventListener('keydown', captureKeybind);
    isCapturingKeybind = false;
  }
}

function startKeybindCapture() {
  isCapturingKeybind = true;
  document.getElementById('keybindList').innerHTML += `
    <div class="keybind-item capturing">
      Press keys now...
      <button class="remove-keybind" onclick="cancelKeybindCapture(this)">Cancel</button>
    </div>
  `;

  document.addEventListener('keydown', captureKeybind);
}

function addKeybind(keybind) {
  if (!keybinds.includes(keybind)) {
    keybinds.push(keybind);
    localStorage.setItem('panicKeys', JSON.stringify(keybinds));
    localStorage.setItem('panicURL', document.getElementById('panicUrl').value);
    renderKeybinds();
  }
}

document.addEventListener('DOMContentLoaded', function() {

  window.settingsInitialized = true;

  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      menuToggle.classList.toggle('active');
    });
  }

  console.log("Setting up navigation handlers");
  const navItems = document.querySelectorAll('.settings-nav-item');
  const sections = document.querySelectorAll('.settings-section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      console.log("Nav item clicked:", item.getAttribute('data-section'));
      const sectionId = item.getAttribute('data-section');

      navItems.forEach(navItem => navItem.classList.remove('active'));
      item.classList.add('active');

      sections.forEach(section => {
        section.classList.remove('active');
        console.log("Removed active from", section.id);
      });

      const targetSection = document.getElementById(`${sectionId}-section`);
      console.log("Target section:", targetSection);
      if (targetSection) {
        targetSection.classList.add('active');
        console.log("Added active to", targetSection.id);
      }
    });
  });

  const tabCloakSelect = document.getElementById('tabCloakSelect');
  if (tabCloakSelect) {
    tabCloakSelect.addEventListener('change', function() {
      const value = this.value;
      const statusElement = document.getElementById('tabCloakStatus');

      if (value === "") {
        SettingsManager.resetCloak();
        localStorage.removeItem('tabCloak');
        statusElement.textContent = 'Currently: Disabled';
        statusElement.className = 'setting-status disabled';
      } else {
        localStorage.setItem('tabCloak', value);
        const option = SettingsManager.CLOAKING_OPTIONS[value];
        SettingsManager.setCloak(option.title, option.favicon);
        statusElement.textContent = `Currently: ${option.title}`;
        statusElement.className = 'setting-status enabled';
      }
    });
  }

  const clickoffSelect = document.getElementById('clickoffSelect');
  if (clickoffSelect) {
    clickoffSelect.addEventListener('change', function() {
      const value = this.value;
      const statusElement = document.getElementById('clickoffStatus');

      if (value === "") {
        localStorage.removeItem('clickoffCloak');
        window.removeEventListener('blur', SettingsManager.handleTabBlur);
        window.removeEventListener('focus', SettingsManager.handleTabFocus);
        statusElement.textContent = 'Currently: Disabled';
        statusElement.className = 'setting-status disabled';
      } else {
        localStorage.setItem('clickoffCloak', value);
        window.addEventListener('blur', SettingsManager.handleTabBlur);
        window.addEventListener('focus', SettingsManager.handleTabFocus);
        const option = SettingsManager.CLOAKING_OPTIONS[value];
        statusElement.textContent = `Currently: ${option.title}`;
        statusElement.className = 'setting-status enabled';
      }
    });
  }

  const addKeybindBtn = document.getElementById('addKeybindBtn');
  if (addKeybindBtn) {
    addKeybindBtn.addEventListener('click', startKeybindCapture);
  }

  const openBlankerBtn = document.getElementById('openBlanker');
  if (openBlankerBtn) {
    openBlankerBtn.addEventListener('click', function() {
      const win = window.open();
      if (win) {
        win.document.body.style.margin = '0';
        win.document.body.style.height = '100vh';
        const iframe = win.document.createElement('iframe');
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.margin = '0';
        iframe.src = window.location.href;
        win.document.body.appendChild(iframe);
      }
    });
  }

  const advancedCloakToggle = document.getElementById('advancedCloakToggle');
  if (advancedCloakToggle) {
    advancedCloakToggle.addEventListener('change', function() {
      const statusElement = document.getElementById('advancedCloakStatus');

      if (this.checked) {
        localStorage.setItem('aboutBlank', 'enabled');
        statusElement.textContent = 'Currently: Enabled (Refresh to apply)';
        statusElement.className = 'setting-status enabled';
      } else {
        localStorage.removeItem('aboutBlank');
        statusElement.textContent = 'Currently: Disabled';
        statusElement.className = 'setting-status disabled';
      }
    });
  }

  const leaveConfToggle = document.getElementById('leaveConfToggle');
  if (leaveConfToggle) {
    leaveConfToggle.addEventListener('change', function() {
      const statusElement = document.getElementById('leaveConfStatus');

      if (this.checked) {
        window.addEventListener('beforeunload', SettingsManager.handleBeforeUnload);
        localStorage.setItem('leaveConf', 'enabled');
        statusElement.textContent = 'Currently: Enabled';
        statusElement.className = 'setting-status enabled';
      } else {
        window.removeEventListener('beforeunload', SettingsManager.handleBeforeUnload);
        localStorage.removeItem('leaveConf');
        statusElement.textContent = 'Currently: Disabled';
        statusElement.className = 'setting-status disabled';
      }
    });
  }

  const darkThemeBtn = document.getElementById('darkTheme');
  const lightThemeBtn = document.getElementById('lightTheme');

  if (darkThemeBtn && lightThemeBtn) {
    darkThemeBtn.addEventListener('click', function() {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
      darkThemeBtn.classList.add('active');
      lightThemeBtn.classList.remove('active');
    });

    lightThemeBtn.addEventListener('click', function() {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
      lightThemeBtn.classList.add('active');
      darkThemeBtn.classList.remove('active');
    });
  }

  const colorButtons = document.querySelectorAll('.setting-card button[style*="background-color"]');
  colorButtons.forEach(button => {
    button.addEventListener('click', function() {
      const color = this.style.backgroundColor;
      document.documentElement.style.setProperty('--primary-color', color);

      const darkerColor = color.replace(/^rgb\((\d+), (\d+), (\d+)\)$/, function(_, r, g, b) {
        return `#${Math.max(0, parseInt(r) - 20).toString(16).padStart(2, '0')}${Math.max(0, parseInt(g) - 20).toString(16).padStart(2, '0')}${Math.max(0, parseInt(b) - 20).toString(16).padStart(2, '0')}`;
      });

      const glowColor = color.replace(/^rgb\((\d+), (\d+), (\d+)\)$/, function(_, r, g, b) {
        return `rgba(${r}, ${g}, ${b}, 0.3)`;
      });

      const transparentColor = color.replace(/^rgb\((\d+), (\d+), (\d+)\)$/, function(_, r, g, b) {
        return `rgba(${r}, ${g}, ${b}, 0.2)`;
      });

      const borderColor = color.replace(/^rgb\((\d+), (\d+), (\d+)\)$/, function(_, r, g, b) {
        return `rgba(${r}, ${g}, ${b}, 0.5)`;
      });

      document.documentElement.style.setProperty('--primary-hover', darkerColor);
      document.documentElement.style.setProperty('--primary-glow', glowColor);
      document.documentElement.style.setProperty('--primary-transparent', transparentColor);
      document.documentElement.style.setProperty('--primary-border', borderColor);

      localStorage.setItem('accentColor', color);
      localStorage.setItem('accentHover', darkerColor);
      localStorage.setItem('accentGlow', glowColor);
      localStorage.setItem('accentTransparent', transparentColor);
      localStorage.setItem('accentBorder', borderColor);

      colorButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
    });
  });

  const resetSettingsBtn = document.getElementById('resetSettingsBtn');
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to reset all settings? This cannot be undone.')) {

        localStorage.removeItem('tabCloak');
        localStorage.removeItem('clickoffCloak');
        localStorage.removeItem('panicKeys');
        localStorage.removeItem('panicURL');
        localStorage.removeItem('aboutBlank');
        localStorage.removeItem('leaveConf');
        localStorage.removeItem('theme');
        localStorage.removeItem('accentColor');
        localStorage.removeItem('accentHover');

        SettingsManager.resetCloak();
        window.removeEventListener('blur', SettingsManager.handleTabBlur);
        window.removeEventListener('focus', SettingsManager.handleTabFocus);
        window.removeEventListener('beforeunload', SettingsManager.handleBeforeUnload);

        window.location.reload();
      }
    });
  }

  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', function() {

      const originalText = this.textContent;
      this.textContent = 'Settings Saved!';
      this.style.backgroundColor = '#10b981';

      setTimeout(() => {
        this.textContent = originalText;
        this.style.backgroundColor = '';
      }, 2000);
    });
  }

  const refreshPageBtn = document.getElementById('refreshPageBtn');
  if (refreshPageBtn) {
    refreshPageBtn.addEventListener('click', function() {
      window.location.reload();
    });
  }

  keybinds = JSON.parse(localStorage.getItem('panicKeys') || '[]');
  renderKeybinds();

  const currentCloak = localStorage.getItem('tabCloak');
  if (currentCloak && tabCloakSelect) {
    tabCloakSelect.value = currentCloak;
    const option = SettingsManager.CLOAKING_OPTIONS[currentCloak];
    const tabCloakStatus = document.getElementById('tabCloakStatus');
    if (tabCloakStatus) {
      tabCloakStatus.textContent = `Currently: ${option.title}`;
      tabCloakStatus.className = 'setting-status enabled';
    }
  }

  const clickoffCloak = localStorage.getItem('clickoffCloak');
  if (clickoffCloak && clickoffSelect) {
    clickoffSelect.value = clickoffCloak;
    const option = SettingsManager.CLOAKING_OPTIONS[clickoffCloak];
    const clickoffStatus = document.getElementById('clickoffStatus');
    if (clickoffStatus) {
      clickoffStatus.textContent = `Currently: ${option.title}`;
      clickoffStatus.className = 'setting-status enabled';
    }
    window.addEventListener('blur', SettingsManager.handleTabBlur);
    window.addEventListener('focus', SettingsManager.handleTabFocus);
  }

  const panicURL = localStorage.getItem('panicURL');
  if (panicURL) {
    const panicUrlInput = document.getElementById('panicUrl');
    if (panicUrlInput) panicUrlInput.value = panicURL;
  }

  if (localStorage.getItem('leaveConf') === 'enabled' && leaveConfToggle) {
    leaveConfToggle.checked = true;
    const leaveConfStatus = document.getElementById('leaveConfStatus');
    if (leaveConfStatus) {
      leaveConfStatus.textContent = 'Currently: Enabled';
      leaveConfStatus.className = 'setting-status enabled';
    }
    window.addEventListener('beforeunload', SettingsManager.handleBeforeUnload);
  }

  if (localStorage.getItem('aboutBlank') === 'enabled' && advancedCloakToggle) {
    advancedCloakToggle.checked = true;
    const advancedCloakStatus = document.getElementById('advancedCloakStatus');
    if (advancedCloakStatus) {
      advancedCloakStatus.textContent = 'Currently: Enabled';
      advancedCloakStatus.className = 'setting-status enabled';
    }
  }

  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (darkThemeBtn && lightThemeBtn) {
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      darkThemeBtn.classList.add('active');
      lightThemeBtn.classList.remove('active');
    } else {
      document.body.classList.add('light-theme');
      lightThemeBtn.classList.add('active');
      darkThemeBtn.classList.remove('active');
    }
  }

  const savedColor = localStorage.getItem('accentColor');
  const savedHover = localStorage.getItem('accentHover');
  if (savedColor) {
    document.documentElement.style.setProperty('--primary-color', savedColor);
    document.documentElement.style.setProperty('--primary-hover', savedHover);

    colorButtons.forEach(button => {
      button.classList.remove('active');
      if (button.style.backgroundColor === savedColor) {
        button.classList.add('active');
      }
    });
  }

  if (typeof SettingsManager.initializeSettings === 'function') {
    SettingsManager.initializeSettings();
  }
});