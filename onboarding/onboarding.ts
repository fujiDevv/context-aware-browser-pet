import { extensionApi } from '../src/shared/platform';
import { t, localizePage } from '../src/shared/i18n';

localizePage();

(function () {
  'use strict';

  const TOTAL_STEPS = 4;
  let currentStep = 0;

  const track = document.getElementById('steps-track') as HTMLElement;
  const btnBack = document.getElementById('btn-back') as HTMLButtonElement;
  const btnNext = document.getElementById('btn-next') as HTMLButtonElement;
  const dotsContainer = document.getElementById('step-dots') as HTMLElement;
  const dots = dotsContainer.querySelectorAll('.step-dot') as NodeListOf<HTMLButtonElement>;
  const consentCheckbox = document.getElementById('consent-checkbox') as HTMLInputElement | null;

  let isConsented = false;
  extensionApi.storage.local.get<{ consentAccepted?: boolean }>('consentAccepted').then((data) => {
    if (data && data.consentAccepted) {
      isConsented = true;
      if (consentCheckbox) consentCheckbox.checked = true;
    }
  }).catch(() => {});

  function goToStep(index: number): void {
    if (index < 0 || index >= TOTAL_STEPS) return;

    // Block moving past Step 3 (index 2) if consent is not accepted
    if (index > 2 && consentCheckbox && !consentCheckbox.checked) {
      alert(t('onboarding_consentRequired'));
      return;
    }

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

    if (currentStep === 2 && consentCheckbox) {
      // Step 3: Privacy & Consent
      btnNext.disabled = !consentCheckbox.checked;
      btnNext.style.opacity = consentCheckbox.checked ? '1' : '0.5';
    } else {
      btnNext.disabled = false;
      btnNext.style.opacity = '1';
    }

    if (currentStep === TOTAL_STEPS - 1) {
      btnNext.innerHTML = `${t('onboarding_finish')} <span class="arrow">✓</span>`;
    } else {
      btnNext.innerHTML = `${t('onboarding_next')} <span class="arrow">→</span>`;
    }
  }

  if (consentCheckbox) {
    consentCheckbox.addEventListener('change', () => {
      if (currentStep === 2) {
        btnNext.disabled = !consentCheckbox.checked;
        btnNext.style.opacity = consentCheckbox.checked ? '1' : '0.5';
      }
    });
  }

  btnNext.addEventListener('click', () => {
    if (currentStep === TOTAL_STEPS - 1) {
      // Save consent to storage
      extensionApi.storage.local.set({ consentAccepted: true }).then(() => {
        window.close();
      }).catch(() => {
        window.close();
      });
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
        // Prevent keyboard shortcut bypass on step 3 if not checked
        if (currentStep === 2 && consentCheckbox && !consentCheckbox.checked) {
          return;
        }
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
    titleKey: string;
    descKey: string;
    icon: string;
  }

  const VERSION_FEATURES: Record<string, Feature[]> = {
    '1.2.7': [
      {
        titleKey: 'onboarding_featureToys',
        descKey: 'onboarding_featureToysDesc',
        icon: '../assets/pets/arcrawls-celebrating.svg'
      },
      {
        titleKey: 'onboarding_featureSynapse',
        descKey: 'onboarding_featureSynapseDesc',
        icon: '../assets/pets/arcrawls-mindblown.svg'
      },
      {
        titleKey: 'onboarding_featureGhost',
        descKey: 'onboarding_featureGhostDesc',
        icon: '../assets/pets/arcrawls-ninja.svg'
      },
      {
        titleKey: 'onboarding_featureMilestones',
        descKey: 'onboarding_featureMilestonesDesc',
        icon: '../assets/pets/arcrawls-working-building.svg'
      },
      {
        titleKey: 'onboarding_featureConsoleWatcher',
        descKey: 'onboarding_featureConsoleWatcherDesc',
        icon: '../assets/pets/arcrawls-working-debugger.svg'
      },
      {
        titleKey: 'onboarding_featureUnified',
        descKey: 'onboarding_featureUnifiedDesc',
        icon: '../assets/pets/arcrawls-cool.svg'
      }
    ],
    '1.1.0': [
      {
        titleKey: 'onboarding_featureGravity',
        descKey: 'onboarding_featureGravityDesc',
        icon: '../assets/pets/arcrawls-climbing.svg'
      },
      {
        titleKey: 'onboarding_featureIntent',
        descKey: 'onboarding_featureIntentDesc',
        icon: '../assets/pets/arcrawls-mindblown.svg'
      },
      {
        titleKey: 'onboarding_featureUnified',
        descKey: 'onboarding_featureUnifiedDesc',
        icon: '../assets/pets/arcrawls-happy.svg'
      },
      {
        titleKey: 'onboarding_featureRedesign',
        descKey: 'onboarding_featureRedesignDesc',
        icon: '../assets/pets/arcrawls-working-building.svg'
      },
      {
        titleKey: 'onboarding_featureLiteMode',
        descKey: 'onboarding_featureLiteModeDesc',
        icon: '../assets/pets/arcrawls-cool.svg'
      },
      {
        titleKey: 'onboarding_featureBattery',
        descKey: 'onboarding_featureBatteryDesc',
        icon: '../assets/pets/arcrawls-charging.svg'
      }
    ]
  };

  if (reason === 'update') {
    const step1Title = document.querySelector('#step-1 .step-title') as HTMLElement | null;
    if (step1Title) {
      step1Title.innerHTML = t('onboarding_updatedTitle');
    }
    const step1Subtitle = document.querySelector('#step-1 .step-subtitle') as HTMLElement | null;
    if (step1Subtitle) {
      step1Subtitle.textContent = t('onboarding_updatedSub', version);
    }

    const step2Title = document.querySelector('#step-2 .step-title') as HTMLElement | null;
    if (step2Title) {
      step2Title.innerHTML = t('onboarding_whatsNewTitle');
    }
    const step2Subtitle = document.querySelector('#step-2 .step-subtitle') as HTMLElement | null;
    if (step2Subtitle) {
      step2Subtitle.textContent = t('onboarding_whatsNewSub', version);
    }

    const featuresGrid = document.querySelector('.features-grid') as HTMLElement | null;
    const features = VERSION_FEATURES[version] || VERSION_FEATURES['1.2.7'];

    if (featuresGrid && features) {
      featuresGrid.innerHTML = features.map(f => `
        <div class="feature-card">
          <div class="feature-icon">
            <img src="${f.icon}" alt="${escapeHtml(t(f.titleKey))}">
          </div>
          <h3>${escapeHtml(t(f.titleKey))}</h3>
          <p>${escapeHtml(t(f.descKey))}</p>
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
      const statusText = reason === 'update' ? t('onboarding_updatedStatus') : t('onboarding_installedStatus');
      badge.innerHTML = `<span class="dot"></span> ${escapeHtml(version)} — ${statusText}`;
    }
  }
})();
