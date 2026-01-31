/**
 * Stonefire - Cloudflare Turnstile Service
 * Handles Cloudflare Turnstile CAPTCHA integration
 */

let widgetId = null;

function initTurnstile() {
  const container = document.getElementById('turnstile-container');
  if (!container) return;

  widgetId = turnstile.render('#turnstile-container', {
    sitekey: '0x4AAAAAACUNIqDJpZ8kMy1f',
    callback: function (token) {
      console.log('Turnstile success');
    },
  });
}

// Wait for Turnstile library to load
if (typeof window !== 'undefined') {
  if (typeof turnstile !== 'undefined') {
    initTurnstile();
  } else {
    // Turnstile script calls this when ready (with render=explicit)
    window.onloadTurnstileCallback = initTurnstile;
  }
}
