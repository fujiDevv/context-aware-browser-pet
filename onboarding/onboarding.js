/**
 * Clawd Onboarding — Step Navigation Controller
 * Handles next/back buttons, dot indicators, and slide transitions.
 */
(function () {
  'use strict';

  const TOTAL_STEPS = 3;
  let currentStep = 0;

  const track = document.getElementById('steps-track');
  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');
  const dotsContainer = document.getElementById('step-dots');
  const dots = dotsContainer.querySelectorAll('.step-dot');

  /**
   * Navigates to the specified step index.
   * @param {number} index - The zero-based step index to navigate to.
   */
  function goToStep(index) {
    if (index < 0 || index >= TOTAL_STEPS) return;
    currentStep = index;

    // Slide the track
    track.style.transform = `translateX(-${currentStep * 100}%)`;

    // Update dot indicators
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentStep);
    });

    // Update back button visibility
    if (currentStep === 0) {
      btnBack.classList.add('hidden');
    } else {
      btnBack.classList.remove('hidden');
    }

    // Update next button text for the last step
    if (currentStep === TOTAL_STEPS - 1) {
      btnNext.innerHTML = 'Close <span class="arrow">✓</span>';
    } else {
      btnNext.innerHTML = 'Next <span class="arrow">→</span>';
    }
  }

  // Next button handler
  btnNext.addEventListener('click', () => {
    if (currentStep === TOTAL_STEPS - 1) {
      // Last step — close the tab
      window.close();
    } else {
      goToStep(currentStep + 1);
    }
  });

  // Back button handler
  btnBack.addEventListener('click', () => {
    goToStep(currentStep - 1);
  });

  // Dot click handler
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const stepIndex = parseInt(dot.getAttribute('data-step'), 10);
      goToStep(stepIndex);
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
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

  // Parse URL params for version display
  const params = new URLSearchParams(window.location.search);
  const version = params.get('version');
  if (version) {
    const badge = document.querySelector('.version-badge');
    if (badge) {
      badge.innerHTML = `<span class="dot"></span> ${version} — Successfully Installed`;
    }
  }
})();
