import { extensionApi } from '../src/platform';

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
  const manifestVersion = extensionApi.runtime.getManifest()?.version || '1.2.7';
  const version = params.get('version') || manifestVersion;
  const reason = params.get('reason') || 'install';

  interface Feature {
    title: string;
    description: string;
    icon: string;
  }

  const VERSION_FEATURES: Record<string, Feature[]> = {
    '1.2.7': [
      {
        title: 'Interactive Toys',
        description: 'Drop bouncy balls, laser pointers, and yarn directly onto the page. Arcrawls chases and plays with them using real-time spring physics!',
        icon: '../assets/pets/arcrawls-celebrating.svg'
      },
      {
        title: '24-Hour AI Synapse',
        description: 'Arcrawls uses local AI to generate a unique, persona-driven daily reflection based on your browsing journey and habits over the last 24 hours.',
        icon: '../assets/pets/arcrawls-mindblown.svg'
      },
      {
        title: 'Ghost Mode & Schedules',
        description: 'Define Focus Blocks to suppress distractions, or use Ghost Mode which dynamically drops Arcrawls to 30% opacity when you type or scroll.',
        icon: '../assets/pets/arcrawls-ninja.svg'
      },
      {
        title: 'Milestones & Traits',
        description: 'Track long-term achievements! Arcrawls now adapts his dominant personality trait (e.g. Gamer, Developer) based on the websites you visit.',
        icon: '../assets/pets/arcrawls-working-building.svg'
      },
      {
        title: 'Console Error Watcher',
        description: 'If a JavaScript runtime error or crashed promise occurs on the webpage, Arcrawls immediately enters "debugger" mode to alert you.',
        icon: '../assets/pets/arcrawls-working-debugger.svg'
      },
      {
        title: 'Unified Consciousness',
        description: 'Personality, emotions, and physical location are flawlessly synchronized across all active tabs in real-time.',
        icon: '../assets/pets/arcrawls-cool.svg'
      }
    ],
    '1.1.0': [
      {
        title: 'Gravity Physics Engine',
        description: 'Arcrawls features a new physics engine restricting him exclusively to the floor and ceiling with smooth spring-based edge snapping.',
        icon: '../assets/pets/arcrawls-climbing.svg'
      },
      {
        title: 'AI Intent Detection',
        description: 'Enhanced AI context awareness with high-fidelity intent detection for smarter, more relevant dialogue.',
        icon: '../assets/pets/arcrawls-mindblown.svg'
      },
      {
        title: 'Unified Consciousness',
        description: 'Personality, emotions, and movement are now synchronized across all same-origin tabs in real-time.',
        icon: '../assets/pets/arcrawls-happy.svg'
      },
      {
        title: 'Visual UI Redesign',
        description: 'Redesigned card-based stats grid and glassmorphic popup with new AI and tab status indicators.',
        icon: '../assets/pets/arcrawls-working-building.svg'
      },
      {
        title: 'Lite Mode & Performance',
        description: 'Default Lite Mode ensures zero-download speed, with an optional "Brain Upgrade" for power users.',
        icon: '../assets/pets/arcrawls-cool.svg'
      },
      {
        title: 'Battery Optimization',
        description: 'Shifted to event-driven updates and lazy initialization for significantly better battery life.',
        icon: '../assets/pets/arcrawls-charging.svg'
      }
    ]
  };

  if (reason === 'update') {
    const step1Title = document.querySelector('#step-1 .step-title') as HTMLElement | null;
    if (step1Title) {
      step1Title.innerHTML = `<span class="brand">Arcrawls</span> Updated!`;
    }
    const step1Subtitle = document.querySelector('#step-1 .step-subtitle') as HTMLElement | null;
    if (step1Subtitle) {
      step1Subtitle.textContent = `Your context-aware AI browser companion has been updated to ${version}. Explore the new cross-tab behaviors and optimized performance!`;
    }

    const step2Title = document.querySelector('#step-2 .step-title') as HTMLElement | null;
    if (step2Title) {
      step2Title.innerHTML = `What's New in <span class="brand">Arcrawls</span>`;
    }
    const step2Subtitle = document.querySelector('#step-2 .step-subtitle') as HTMLElement | null;
    if (step2Subtitle) {
      step2Subtitle.textContent = `Version ${version} brings significant architectural improvements and new features.`;
    }

    const featuresGrid = document.querySelector('.features-grid') as HTMLElement | null;
    const features = VERSION_FEATURES[version] || VERSION_FEATURES['1.2.7'];

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

  function escapeHtml(unsafe: string): string {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  if (version) {
    const badge = document.querySelector('.version-badge') as HTMLElement | null;
    if (badge) {
      const statusText = reason === 'update' ? 'Successfully Updated' : 'Successfully Installed';
      badge.innerHTML = `<span class="dot"></span> ${escapeHtml(version)} — ${statusText}`;
    }
  }
})();
