// ReplyAI Welcome Page Script
document.addEventListener('DOMContentLoaded', function() {
  // Add event listener to the CTA button
  const ctaButton = document.querySelector('.cta-button');
  if (ctaButton) {
    ctaButton.addEventListener('click', function() {
      // Close the welcome page and let user click the extension icon
      window.close();
    });
  }
}); 