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
  const version = params.get('version');
  const reason = params.get('reason') || 'install';

  if (reason === 'update') {
    const step1Title = document.querySelector('#step-1 .step-title') as HTMLElement | null;
    if (step1Title) {
      step1Title.innerHTML = `<span class="brand">Clawd</span> Updated!`;
    }
    const step1Subtitle = document.querySelector('#step-1 .step-subtitle') as HTMLElement | null;
    if (step1Subtitle) {
      step1Subtitle.textContent = `Your context-aware AI browser companion has been updated. Explore the new adaptive learning systems, custom physics, and more!`;
    }

    const step2Title = document.querySelector('#step-2 .step-title') as HTMLElement | null;
    if (step2Title) {
      step2Title.innerHTML = `What's New in <span class="brand">Clawd</span>`;
    }
    const step2Subtitle = document.querySelector('#step-2 .step-subtitle') as HTMLElement | null;
    if (step2Subtitle) {
      step2Subtitle.textContent = `Here is a quick look at the new features and improvements in this release.`;
    }

    const featuresGrid = document.querySelector('.features-grid') as HTMLElement | null;
    if (featuresGrid) {
      featuresGrid.innerHTML = `
        <div class="feature-card">
          <div class="feature-icon">
            <img src="../assets/pets/clawd-working-thinking.svg" alt="Adaptive Traits">
          </div>
          <h3>Adaptive Traits</h3>
          <p>Clawd learns traits (Developer, Gamer, Scholar, Socialite) from your site visits and updates default idle animations.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <img src="../assets/pets/clawd-cool.svg" alt="Speed Modifiers">
          </div>
          <h3>Speed Modifiers</h3>
          <p>Crawling speed dynamically scales based on energy and active trait (calm developer vs. hyperactive gamer).</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <img src="../assets/pets/clawd-celebrating.svg" alt="Seasonal Toggle">
          </div>
          <h3>Seasonal Toggle</h3>
          <p>Configure and toggle holiday outfits and behaviors directly from the popup settings.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <img src="../assets/pets/clawd-happy.svg" alt="Local Support">
          </div>
          <h3>Local Support</h3>
          <p>Direct support email and issue tracker links are now integrated directly inside the settings card.</p>
        </div>
      `;
    }
  }

  if (version) {
    const badge = document.querySelector('.version-badge') as HTMLElement | null;
    if (badge) {
      const statusText = reason === 'update' ? 'Successfully Updated' : 'Successfully Installed';
      badge.innerHTML = `<span class="dot"></span> ${version} — ${statusText}`;
    }
  }
})();
