const SettingsManager = (function() {

  const CLOAKING_OPTIONS = {
    drive: {
      title: "Google Drive",
      favicon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png"
    },
    docs: {
      title: "Google Docs",
      favicon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon-2023q4.ico"
    },
    classroom: {
      title: "Google Classroom",
      favicon: "https://www.gstatic.com/classroom/logo_square_rounded.svg"
    },
    canvas: {
      title: "Canvas",
      favicon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico"
    },
    powerschool: {
      title: "PowerSchool Learning",
      favicon: "https://www.powerschool.com/favicon.ico"
    },
    gmail: {
      title: "Gmail",
      favicon: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico"
    },
    google: {
      title: "Google",
      favicon: "https://www.google.com/favicon.ico"
    }
  };

  const originalTitle = document.title;
  const originalFavicon = document.querySelector("link[rel='icon']")?.href || '/favicon.ico';

  const ACCENT_COLORS = {
    indigo: {
      primary: '#6366f1',
      hover: '#4f46e5'
    },
    purple: {
      primary: '#8b5cf6',
      hover: '#7c3aed'
    }
  };

  let hasInteracted = false;
  let leaveConfInterval = null;

  function setCloak(title, favicon) {
    document.title = title;
    const faviconElement = document.querySelector("link[rel='icon']") || document.createElement('link');
    faviconElement.type = 'image/x-icon';
    faviconElement.rel = 'icon';
    faviconElement.href = favicon;
    if (!faviconElement.parentNode) {
      document.head.appendChild(faviconElement);
    }
  }

  function resetCloak() {
    document.title = originalTitle;
    const favicon = document.querySelector("link[rel='icon']") || document.createElement('link');
    favicon.type = 'image/x-icon';
    favicon.rel = 'icon';
    favicon.href = originalFavicon;
    if (!favicon.parentNode) {
      document.head.appendChild(favicon);
    }
  }

  function handleTabBlur() {
    const clickoffType = localStorage.getItem('clickoffCloak');
    if (clickoffType && CLOAKING_OPTIONS[clickoffType]) {
      setCloak(CLOAKING_OPTIONS[clickoffType].title, CLOAKING_OPTIONS[clickoffType].favicon);
    }
  }

  function handleTabFocus() {
    const currentCloak = localStorage.getItem('tabCloak');
    if (currentCloak && CLOAKING_OPTIONS[currentCloak]) {
      setCloak(CLOAKING_OPTIONS[currentCloak].title, CLOAKING_OPTIONS[currentCloak].favicon);
    } else {
      resetCloak();
    }
  }

  function handlePanicKey(e) {
    const keybinds = JSON.parse(localStorage.getItem('panicKeys') || '[]');
    if (!keybinds.length) return; 

    const panicURL = localStorage.getItem('panicURL') || 'https://classroom.google.com/';

    for (const keybind of keybinds) {
      const keys = keybind.split('+').map(k => k.trim().toLowerCase());
      const modifierKeys = keys.filter(k => ['ctrl', 'alt', 'shift'].includes(k));
      const regularKey = keys.find(k => !['ctrl', 'alt', 'shift'].includes(k));

      const modifiersMatch = 
        (modifierKeys.includes('ctrl') === e.ctrlKey) && 
        (modifierKeys.includes('alt') === e.altKey) && 
        (modifierKeys.includes('shift') === e.shiftKey);

      if (modifiersMatch && regularKey && e.key.toLowerCase() === regularKey.toLowerCase()) {
        e.preventDefault();
        window.location.href = panicURL;
        return; 
      }
    }
  }

  function handleBeforeUnload(e) {
    const confirmationMessage = 'Changes you made may not be saved.';
    e.preventDefault();
    e.returnValue = confirmationMessage;
    return confirmationMessage;
  }

  function isLeaveConfEnabled() {
    return localStorage.getItem('leaveConf') === 'enabled';
  }

  function attachLeaveConfirmation() {
    window.removeEventListener('beforeunload', handleBeforeUnload);

    if (isLeaveConfEnabled()) {
      window.onbeforeunload = handleBeforeUnload;
      window.addEventListener('beforeunload', handleBeforeUnload);
      return true;
    } else {
      window.onbeforeunload = null;
      return false;
    }
  }

  function setAccentColor(color) {
    if (!ACCENT_COLORS[color]) return;

    const { primary, hover } = ACCENT_COLORS[color];
    const glow = `${primary}33`;

    localStorage.setItem('accentColor', primary);
    localStorage.setItem('accentHover', hover);
    localStorage.setItem('accentGlow', glow);

    document.documentElement.style.setProperty('--primary-color', primary);
    document.documentElement.style.setProperty('--primary-hover', hover);
    document.documentElement.style.setProperty('--primary-glow', glow);
  }

  function initializeSettings() {

    const currentCloak = localStorage.getItem('tabCloak');
    if (currentCloak && CLOAKING_OPTIONS[currentCloak]) {
      setCloak(CLOAKING_OPTIONS[currentCloak].title, CLOAKING_OPTIONS[currentCloak].favicon);
    }

    const clickoffCloak = localStorage.getItem('clickoffCloak');
    if (clickoffCloak) {
      window.addEventListener('blur', handleTabBlur);
      window.addEventListener('focus', handleTabFocus);
    }

    document.addEventListener('keydown', handlePanicKey);

    if (isLeaveConfEnabled()) {
      attachLeaveConfirmation();

      if (!leaveConfInterval) {
        leaveConfInterval = setInterval(() => {
          if (hasInteracted) attachLeaveConfirmation();
        }, 1000);
      }
    }

    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedColor = localStorage.getItem('accentColor');
    const savedHover = localStorage.getItem('accentHover');
    const savedGlow = localStorage.getItem('accentGlow');

    if (savedColor) {
      document.documentElement.style.setProperty('--primary-color', savedColor);
      document.documentElement.style.setProperty('--primary-hover', savedHover || savedColor);
      document.documentElement.style.setProperty('--primary-glow', savedGlow || `${savedColor}33`);
    }
  }

  function toggleLeaveConfirmation() {
    const currentState = isLeaveConfEnabled();

    if (currentState) {
      localStorage.removeItem('leaveConf');
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (leaveConfInterval) {
        clearInterval(leaveConfInterval);
        leaveConfInterval = null;
      }
    } else {
      localStorage.setItem('leaveConf', 'enabled');
      window.addEventListener('beforeunload', handleBeforeUnload);
      if (!leaveConfInterval) {
        leaveConfInterval = setInterval(() => attachLeaveConfirmation(), 5000);
      }
    }

    return !currentState;
  }

  document.addEventListener('click', () => hasInteracted = true);

  return {
    CLOAKING_OPTIONS,
    setCloak,
    resetCloak,
    handleTabBlur,
    handleTabFocus,
    handlePanicKey,
    handleBeforeUnload,
    isLeaveConfEnabled,
    toggleLeaveConfirmation,
    attachLeaveConfirmation,
    initializeSettings,
    setAccentColor
  };
})();

SettingsManager.initializeSettings();

document.addEventListener('DOMContentLoaded', function() {
  if (window.settingsInitialized) return;
  window.settingsInitialized = true;

  document.addEventListener('click', () => {
    if (SettingsManager.isLeaveConfEnabled()) {
      SettingsManager.attachLeaveConfirmation();
    }
  });

  function updateTabCloakStatus(value = '') {
    const statusElement = document.getElementById('tabCloakStatus');
    if (!statusElement) return;

    if (value && SettingsManager.CLOAKING_OPTIONS[value]) {
      const option = SettingsManager.CLOAKING_OPTIONS[value];
      statusElement.textContent = `Currently: ${option.title}`;
      statusElement.className = 'setting-status enabled';
    } else {
      statusElement.textContent = 'Currently: Disabled';
      statusElement.className = 'setting-status disabled';
    }
  }

  function updateClickoffStatus(value = '') {
    const statusElement = document.getElementById('clickoffStatus');
    if (!statusElement) return;

    if (value && SettingsManager.CLOAKING_OPTIONS[value]) {
      const option = SettingsManager.CLOAKING_OPTIONS[value];
      statusElement.textContent = `Currently: ${option.title}`;
      statusElement.className = 'setting-status enabled';
    } else {
      statusElement.textContent = 'Currently: Disabled';
      statusElement.className = 'setting-status disabled';
    }
  }

  const tabCloakSelect = document.getElementById('tabCloakSelect');
  if (tabCloakSelect) {
    tabCloakSelect.style.pointerEvents = 'auto';
    tabCloakSelect.style.opacity = '1';

    const savedTabCloak = localStorage.getItem('tabCloak') || '';
    tabCloakSelect.value = savedTabCloak;
    updateTabCloakStatus(savedTabCloak);

    tabCloakSelect.addEventListener('mousedown', e => e.currentTarget.focus());

    tabCloakSelect.addEventListener('change', function() {
      const value = this.value;
      if (value === "") {
        SettingsManager.resetCloak();
        localStorage.removeItem('tabCloak');
        updateTabCloakStatus();
      } else {
        localStorage.setItem('tabCloak', value);
        const option = SettingsManager.CLOAKING_OPTIONS[value];
        SettingsManager.setCloak(option.title, option.favicon);
        updateTabCloakStatus(value);
      }
    });
  }

  const clickoffSelect = document.getElementById('clickoffSelect');
  if (clickoffSelect) {
    clickoffSelect.style.pointerEvents = 'auto';
    clickoffSelect.style.opacity = '1';

    const savedClickoff = localStorage.getItem('clickoffCloak') || '';
    clickoffSelect.value = savedClickoff;
    updateClickoffStatus(savedClickoff);

    clickoffSelect.addEventListener('mousedown', e => e.currentTarget.focus());

    clickoffSelect.addEventListener('change', function() {
      const value = this.value;
      if (value === "") {
        localStorage.removeItem('clickoffCloak');
        window.removeEventListener('blur', SettingsManager.handleTabBlur);
        window.removeEventListener('focus', SettingsManager.handleTabFocus);
        updateClickoffStatus();
      } else {
        localStorage.setItem('clickoffCloak', value);
        window.addEventListener('blur', SettingsManager.handleTabBlur);
        window.addEventListener('focus', SettingsManager.handleTabFocus);
        updateClickoffStatus(value);
      }
    });
  }

  setTimeout(() => {
    if (SettingsManager.isLeaveConfEnabled()) {
      SettingsManager.attachLeaveConfirmation();
    }
  }, 1000);
});

window.SettingsManager = SettingsManager;