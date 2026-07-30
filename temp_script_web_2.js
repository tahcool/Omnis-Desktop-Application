
          /**
           * OmnisResizer: Automatically scales the UI to fit the window width.
           * Prevents content cutting on smaller laptop/tablet screens.
           */
          function applyOmnisAutoScaling() {
            // Auto-scaling disabled: body.style.zoom and CSS transform:scale
            // both corrupt height:100% layout in Electron, pushing views below viewport.
            // Use Electron's native webContents.setZoomFactor() if scaling is needed.
            document.body.style.zoom = '';
          }

          // Clear any previously applied zoom on load
          applyOmnisAutoScaling();
          document.addEventListener('DOMContentLoaded', applyOmnisAutoScaling);

          // Responsive Navigation Bar height tracking
          document.addEventListener('DOMContentLoaded', () => {
            const nav = document.querySelector('.omnis-top-nav');
            if (nav && window.ResizeObserver) {
              new ResizeObserver(entries => {
                const h = entries[0].target.offsetHeight;
                document.documentElement.style.setProperty('--nav-height', `${h}px`);
                
                // Also update any currently visible views that use the inset property
                const allViews = document.querySelectorAll('.view-page, .view-content');
                allViews.forEach(v => {
                  if (v.id !== 'view-settings' && !v.classList.contains('hidden') && v.style.position === 'absolute') {
                    v.style.setProperty("inset", `var(--nav-height, ${h}px) 0 0 0`, "important");
                    v.style.setProperty("height", `calc(100% - var(--nav-height, ${h}px))`, "important");
                  }
                });
              }).observe(nav);
            }
          });
        