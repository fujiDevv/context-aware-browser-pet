// Captured in the webpage's MAIN world context to bypass Content Security Policies
window.addEventListener('error', (event) => {
  window.postMessage({ type: 'PET_PAGE_ERROR', message: event.message }, '*');
});

window.addEventListener('unhandledrejection', (event) => {
  window.postMessage({ type: 'PET_PAGE_ERROR', message: event.reason?.message || 'Unhandled rejection' }, '*');
});
