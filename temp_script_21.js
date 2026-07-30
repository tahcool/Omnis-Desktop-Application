
    // --- DEEP LINK LISTENER ---
    if (window.electron && window.electron.on) {
      window.electron.on('deep-link', (event, url) => {
        try {
          if (url && url.includes('omnis://quote/')) {
            const quoteId = url.split('omnis://quote/')[1].replace(/\//g, '').trim();
            if (quoteId && window.showQuotationOptions) {
              window.showQuotationOptions(quoteId, false);
            }
          }
        } catch (err) {
          console.error("Failed to parse deep link:", err);
        }
      });
    }
  