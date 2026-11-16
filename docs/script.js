/**
 * VaultX Landing Page Interactive Script
 * Zero dependencies, accessible, high-performance vanilla JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Header scroll listener
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 25) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });

  // 2. Mobile Menu Drawer Toggle
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const closeBtn = document.querySelector('.mobile-drawer-close');

  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', () => {
      drawer.classList.toggle('open');
      const isOpen = drawer.classList.contains('open');
      menuBtn.setAttribute('aria-expanded', isOpen);
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        drawer.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    }

    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 3. Toast Notification Helper
  const toast = document.getElementById('toastNotice');
  const toastText = document.getElementById('toastNoticeText');
  let toastTimer = null;

  function showToast(message) {
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // 4. Interactive Screenshots Gallery
  const screenshotData = [
    {
      img: 'assets/screenshots/1.png',
      badge: 'AUTHENTICATION',
      title: 'Hardware Biometric Authentication',
      desc: 'Seamlessly access your credentials using native Android biometric authentication backed by hardware-isolated KeyStore keys and zero-knowledge master password derivation.',
      highlights: [
        'Android BiometricPrompt hardware security',
        'Persistent SecureStore lockout throttling',
        'Zero accounts or email registrations required'
      ]
    },
    {
      img: 'assets/screenshots/2.png',
      badge: 'ORGANIZATION',
      title: 'Isolated Workspaces',
      desc: 'Segregate personal credentials, work projects, and confidential banking records into separate isolated spaces with customized category tagging.',
      highlights: [
        'Dedicated Personal and Work workspaces',
        'Instant 1-tap workspace filter switching',
        'Scoped category and credential organization'
      ]
    },
    {
      img: 'assets/screenshots/3.png',
      badge: 'DASHBOARD & 2FA',
      title: 'Vault Dashboard & Authenticator',
      desc: 'View all credentials with real-time RFC 6238 TOTP two-factor authentication codes, live countdown timer rings, and one-tap clipboard copying.',
      highlights: [
        'Built-in 2FA/TOTP rotating 6-digit codes',
        'Service brand logos and visual categorization',
        'Direct link launch and search filtering'
      ]
    },
    {
      img: 'assets/screenshots/4.png',
      badge: 'CREDENTIAL MANAGEMENT',
      title: 'Alphanumeric Custom Fields',
      desc: 'Store usernames, emails, master passwords, TOTP secrets, notes, and custom reorderable secret fields (e.g., secondary PINs or security questions).',
      highlights: [
        'Up and Down field reordering controls',
        'Base32 TOTP secret input with whitespace sanitization',
        'Alphanumeric custom fields with eye reveal toggles'
      ]
    },
    {
      img: 'assets/screenshots/5.png',
      badge: 'DIGITAL WALLET',
      title: 'Encrypted Payment Cards',
      desc: 'Store credit and debit cards with formatted number previews, expiration dates, cardholder details, and masked CVV protection.',
      highlights: [
        'Formatted card number grouping (4-4-4-4)',
        'Hidden CVV with on-demand reveal toggle',
        'Support for Visa, Mastercard, RuPay and Amex'
      ]
    },
    {
      img: 'assets/screenshots/6.png',
      badge: 'WALLET EDITOR',
      title: 'Seamless Card Enrollment',
      desc: 'Add payment cards with customizable cardholder details, billing notes, and visual gradient accents locked down with AES-256.',
      highlights: [
        'Quick card entry with validation feedback',
        'Encrypted cardholder and billing details',
        'Zero cloud or third-party card processing'
      ]
    },
    {
      img: 'assets/screenshots/7.png',
      badge: 'ENTROPY GENERATION',
      title: 'CSPRNG Password Generator',
      desc: 'Generate mathematically unbreakable passwords with custom lengths (8 to 64 chars), character classes, and interactive Material Design slider controls.',
      highlights: [
        'Java SecureRandom entropy backing',
        'Configurable uppercase, digits, and symbol sets',
        'Live entropy score and strength feedback'
      ]
    },
    {
      img: 'assets/screenshots/8.png',
      badge: 'SECURITY & HARDENING',
      title: 'Modern Privacy Controls',
      desc: 'Configure fail-closed screenshot blocking, background clipboard auto-wipe timers, master password changes, and encrypted local backups.',
      highlights: [
        'FLAG_SECURE display protection against snooping',
        'Configurable 45-second clipboard auto-clear',
        'PBKDF2 + HMAC encrypted local JSON backup exports'
      ]
    }
  ];

  const galleryImg = document.getElementById('galleryImg');
  const galleryBadge = document.getElementById('galleryBadge');
  const galleryTitle = document.getElementById('galleryTitle');
  const galleryDesc = document.getElementById('galleryDesc');
  const galleryHighlights = document.getElementById('galleryHighlights');
  const galleryTabs = document.querySelectorAll('.gallery-tab-btn');

  function updateGallery(index) {
    const data = screenshotData[index];
    if (!data) return;

    // Fade out slightly
    if (galleryImg) {
      galleryImg.style.opacity = '0.4';
      setTimeout(() => {
        galleryImg.src = data.img;
        galleryImg.style.opacity = '1';
      }, 120);
    }

    if (galleryBadge) galleryBadge.textContent = data.badge;
    if (galleryTitle) galleryTitle.textContent = data.title;
    if (galleryDesc) galleryDesc.textContent = data.desc;

    if (galleryHighlights) {
      galleryHighlights.innerHTML = data.highlights.map(item => `
        <li class="gallery-highlight-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>${item}</span>
        </li>
      `).join('');
    }

    galleryTabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === index);
      tab.setAttribute('aria-selected', i === index);
    });
  }

  galleryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const idx = parseInt(tab.getAttribute('data-index'), 10);
      updateGallery(idx);
    });
  });

  // 5. Interactive Browser Password Generator Tool
  const genOutput = document.getElementById('genPasswordOutput');
  const genLengthSlider = document.getElementById('genLengthSlider');
  const genLengthVal = document.getElementById('genLengthVal');
  const genUpper = document.getElementById('genOptUpper');
  const genLower = document.getElementById('genOptLower');
  const genNumbers = document.getElementById('genOptNumbers');
  const genSymbols = document.getElementById('genOptSymbols');
  const genRefreshBtn = document.getElementById('genRefreshBtn');
  const genCopyBtn = document.getElementById('genCopyBtn');
  const strengthBar = document.getElementById('strengthBarFill');
  const strengthLabel = document.getElementById('strengthLabel');

  const CHAR_SETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  function generatePassword() {
    let charset = '';
    if (genUpper && genUpper.checked) charset += CHAR_SETS.upper;
    if (genLower && genLower.checked) charset += CHAR_SETS.lower;
    if (genNumbers && genNumbers.checked) charset += CHAR_SETS.numbers;
    if (genSymbols && genSymbols.checked) charset += CHAR_SETS.symbols;

    if (!charset) {
      if (genLower) genLower.checked = true;
      charset = CHAR_SETS.lower;
    }

    const length = genLengthSlider ? parseInt(genLengthSlider.value, 10) : 18;
    if (genLengthVal) genLengthVal.textContent = length;

    // Cryptographically secure random values in browser
    const randomBuffer = new Uint32Array(length);
    window.crypto.getRandomValues(randomBuffer);

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[randomBuffer[i] % charset.length];
    }

    if (genOutput) genOutput.textContent = password;
    updateStrength(password, charset.length);
  }

  function updateStrength(password, poolSize) {
    if (!strengthBar || !strengthLabel) return;
    const entropy = password.length * Math.log2(poolSize || 26);
    
    let pct = 0;
    let label = 'Weak';
    let color = 'var(--accent-rose)';

    if (entropy < 40) {
      pct = 25;
      label = 'Weak';
      color = 'var(--accent-rose)';
    } else if (entropy < 60) {
      pct = 50;
      label = 'Fair';
      color = 'var(--accent-amber)';
    } else if (entropy < 80) {
      pct = 75;
      label = 'Strong';
      color = 'var(--accent-cyan)';
    } else {
      pct = 100;
      label = 'Unbreakable';
      color = 'var(--accent-emerald)';
    }

    strengthBar.style.width = pct + '%';
    strengthBar.style.backgroundColor = color;
    strengthLabel.textContent = `${label} (${Math.round(entropy)} bits)`;
    strengthLabel.style.color = color;
  }

  if (genLengthSlider) {
    genLengthSlider.addEventListener('input', generatePassword);
  }

  [genUpper, genLower, genNumbers, genSymbols].forEach(cb => {
    if (cb) cb.addEventListener('change', generatePassword);
  });

  if (genRefreshBtn) {
    genRefreshBtn.addEventListener('click', () => {
      genRefreshBtn.style.transform = 'rotate(180deg)';
      setTimeout(() => { genRefreshBtn.style.transform = 'rotate(0deg)'; }, 250);
      generatePassword();
    });
  }

  if (genCopyBtn) {
    genCopyBtn.addEventListener('click', () => {
      if (genOutput && genOutput.textContent) {
        navigator.clipboard.writeText(genOutput.textContent).then(() => {
          showToast('Generated password copied to clipboard');
        }).catch(() => {
          showToast('Failed to copy password');
        });
      }
    });
  }

  // Initial password generation
  generatePassword();

  // 6. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // Close other items
        faqItems.forEach(other => {
          if (other !== item) {
            other.classList.remove('open');
            const otherBtn = other.querySelector('.faq-trigger');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });
        item.classList.toggle('open');
        trigger.setAttribute('aria-expanded', !isOpen);
      });
    }
  });

  // 7. Generic Copy Trigger buttons
  document.querySelectorAll('[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const text = targetEl.textContent || targetEl.innerText;
        navigator.clipboard.writeText(text.trim()).then(() => {
          showToast('Copied to clipboard');
        });
      }
    });
  });

  // 8. Smooth Scroll for Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
