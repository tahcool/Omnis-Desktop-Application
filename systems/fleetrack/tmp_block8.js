    // Re-initialize modal elements after they've been relocated to the bottom of the DOM
    window.mcModalOverlay = document.getElementById("mc-modal-overlay");
    window.mcTitle = document.getElementById("mc-title");
    window.mcSubtitle = document.getElementById("mc-subtitle");
    window.mcBody = document.getElementById("mc-body");
    window.mcAddBreakdown = document.getElementById("mc-add-breakdown");
    window.mcAddHmr = document.getElementById("mc-add-hmr");
    window.mcClose = document.getElementById("mc-close");
    
    // Safety check
    if (window.ftDebugLog) window.ftDebugLog("Modal elements re-registered at bottom.");
    
    // Add actions
    if (window.mcAddHmr) {
      window.mcAddHmr.addEventListener("click", () => {
        if (window.MC_CURRENT_MACHINE && typeof window.openHmrLogModal === "function") {
          window.openHmrLogModal(window.MC_CURRENT_MACHINE);
        }
      });
    }
    
    if (window.mcAddBreakdown) {
      window.mcAddBreakdown.addEventListener("click", () => {
        if (window.MC_CURRENT_MACHINE && typeof window.openCreateModal === "function") {
          window.openCreateModal(window.MC_CURRENT_MACHINE.name);
        }
      });
    }
    
    // Add close listeners for the new elements
    const setModalHidden = () => {
      if (window.mcModalOverlay) {
        window.mcModalOverlay.classList.add("hidden");
        window.mcModalOverlay.style.setProperty("display", "none", "important");
      }
    };

    if (window.mcClose) {
      window.mcClose.addEventListener("click", setModalHidden);
    }
    
    if (window.mcModalOverlay) {
      window.mcModalOverlay.addEventListener("click", (e) => {
        if (e.target === window.mcModalOverlay) {
          setModalHidden();
        }
      });
    }