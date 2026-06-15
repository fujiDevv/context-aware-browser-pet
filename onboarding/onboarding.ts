(function () {
  'use strict';

  const TOTAL_STEPS = 3;
  let currentStep = 0;

  const track = document.getElementById('steps-track') as HTMLElement;
  const btnBack = document.getElementById('btn-back') as HTMLButtonElement;
  const btnNext = document.getElementById('btn-next') as HTMLButtonElement;
  const dotsContainer = document.getElementById('step-dots') as HTMLElement;
  const dots = dotsContainer.querySelectorAll('.step-dot') as NodeListOf<HTMLButtonElement>;

  function goToStep(index: number): void {
    if (index < 0 || index >= TOTAL_STEPS) return;
    currentStep = index;

    track.style.transform = `translateX(-${currentStep * 100}%)`;

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentStep);
    });

    if (currentStep === 0) {
      btnBack.classList.add('hidden');
    } else {
      btnBack.classList.remove('hidden');
    }

    if (currentStep === TOTAL_STEPS - 1) {
      btnNext.innerHTML = 'Close <span class="arrow">✓</span>';
    } else {
      btnNext.innerHTML = 'Next <span class="arrow">→</span>';
    }
  }

  btnNext.addEventListener('click', () => {
    if (currentStep === TOTAL_STEPS - 1) {
      window.close();
    } else {
      goToStep(currentStep + 1);
    }
  });

  btnBack.addEventListener('click', () => {
    goToStep(currentStep - 1);
  });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const stepData = dot.getAttribute('data-step');
      if (stepData) {
        const stepIndex = parseInt(stepData, 10);
        goToStep(stepIndex);
      }
    });
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      if (currentStep < TOTAL_STEPS - 1) {
        goToStep(currentStep + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      if (currentStep > 0) {
        goToStep(currentStep - 1);
      }
    }
  });

  const params = new URLSearchParams(window.location.search);
  const manifestVersion = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) 
    ? chrome.runtime.getManifest().version 
    : '1.1.0';
  const version = params.get('version') || manifestVersion;
  const reason = params.get('reason') || 'install';

  interface Feature {
    title: string;
    description: string;
    icon: string;
  }

  const VERSION_FEATURES: Record<string, Feature[]> = {
    '1.1.0': [
      {
        title: 'Four-Edge Crawling',
        description: 'Clawd can now crawl along all four edges of your screen with improved spring physics and rotation.',
        icon: '../assets/pets/clawd-climbing.svg'
      },
      {
        title: 'AI Intent Detection',
        description: 'Enhanced AI context awareness with high-fidelity intent detection for smarter, more relevant dialogue.',
        icon: '../assets/pets/clawd-mindblown.svg'
      },
      {
        title: 'Unified Consciousness',
        description: 'Personality, emotions, and movement are now synchronized across all same-origin tabs in real-time.',
        icon: '../assets/pets/clawd-happy.svg'
      },
      {
        title: 'Visual UI Redesign',
        description: 'Redesigned card-based stats grid and glassmorphic popup with new AI and tab status indicators.',
        icon: '../assets/pets/clawd-working-building.svg'
      },
      {
        title: 'Lite Mode & Performance',
        description: 'Default Lite Mode ensures zero-download speed, with an optional "Brain Upgrade" for power users.',
        icon: '../assets/pets/clawd-cool.svg'
      },
      {
        title: 'Battery Optimization',
        description: 'Shifted to event-driven updates and lazy initialization for significantly better battery life.',
        icon: '../assets/pets/clawd-charging.svg'
      }
    ]
  };

  if (reason === 'update') {
    const step1Title = document.querySelector('#step-1 .step-title') as HTMLElement | null;
    if (step1Title) {
      step1Title.innerHTML = `<span class="brand">Clawd</span> Updated!`;
    }
    const step1Subtitle = document.querySelector('#step-1 .step-subtitle') as HTMLElement | null;
    if (step1Subtitle) {
      step1Subtitle.textContent = `Your context-aware AI browser companion has been updated to ${version}. Explore the new cross-tab behaviors and optimized performance!`;
    }

    const step2Title = document.querySelector('#step-2 .step-title') as HTMLElement | null;
    if (step2Title) {
      step2Title.innerHTML = `What's New in <span class="brand">Clawd</span>`;
    }
    const step2Subtitle = document.querySelector('#step-2 .step-subtitle') as HTMLElement | null;
    if (step2Subtitle) {
      step2Subtitle.textContent = `Version ${version} brings significant architectural improvements and new features.`;
    }

    const featuresGrid = document.querySelector('.features-grid') as HTMLElement | null;
    const features = VERSION_FEATURES[version] || VERSION_FEATURES['1.1.0'];

    if (featuresGrid && features) {
      featuresGrid.innerHTML = features.map(f => `
        <div class="feature-card">
          <div class="feature-icon">
            <img src="${f.icon}" alt="${f.title}">
          </div>
          <h3>${f.title}</h3>
          <p>${f.description}</p>
        </div>
      `).join('');
    }
  }

  if (version) {
    const badge = document.querySelector('.version-badge') as HTMLElement | null;
    if (badge) {
      const statusText = reason === 'update' ? 'Successfully Updated' : 'Successfully Installed';
      badge.innerHTML = `<span class="dot"></span> v${version} — ${statusText}`;
    }
  }
})();
