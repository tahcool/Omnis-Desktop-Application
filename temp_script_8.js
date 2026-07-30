
    window.omnisLog = function (msg, type = "info") {
      const el = document.getElementById("omnis-debug-log");
      if (!el) {
        console.log(`[Omnis ${type.toUpperCase()}]`, msg);
        return;
      }
      const timestamp = new Date().toLocaleTimeString();
      const color = type === "error" ? "#f87171" : (type === "success" ? "#4ade80" : "#fbbf24");
      const entry = document.createElement("div");
      entry.style.cssText = "margin-bottom:8px; border-bottom:1px solid #334155; padding-bottom:4px;";
      entry.innerHTML = `<span style="color:#64748b;">[${timestamp}]</span> <span style="color:${color}; font-weight:700;">${type.toUpperCase()}:</span> ${typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg}`;
      el.appendChild(entry);
      el.scrollTop = el.scrollHeight;
    };

    // Catch global errors and log to the console
    window.onerror = function (message, source, lineno, colno, error) {
      window.omnisLog(`JS ERROR: ${message} at ${source}:${lineno}`, "error");
      return false;
    };

    window.omnisLog("Omnis Debug Console Initialized. Waiting for data...", "success");
  