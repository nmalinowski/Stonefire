/**
 * Stonefire - Cloudflare Turnstile Service
 * Handles Cloudflare Turnstile CAPTCHA integration
 */

const widgetId = turnstile.render("#turnstile-container", {
  sitekey: "0x4AAAAAACUNIqDJpZ8kMy1f",
  callback: function (token) {
    console.log("Success:", token);
  },
});