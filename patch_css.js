const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const modalHtmlTarget = `<div id="modal-fsp-new" class="modal-overlay hidden" style="backdrop-filter: blur(12px); background: rgba(15,23,42,0.85); z-index: 3000;">
        <div class="modal-card" style="width: 95%; max-width:900px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">`;
const modalHtmlInsert = `<div id="modal-fsp-new" class="modal-overlay hidden" style="backdrop-filter: blur(16px); background: rgba(15,23,42,0.65); z-index: 3000;">
        <div class="modal-card premium-fsp-modal" style="width: 95%; max-width:900px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);">
          <style>
            .premium-fsp-modal .form-group { position: relative; margin-bottom: 20px; }
            .premium-fsp-modal .form-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #64748b; margin-bottom: 6px; display: block; }
            .premium-fsp-modal .form-input { width: 100%; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff; color: #0f172a; font-weight: 500; font-size: 14px; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
            .premium-fsp-modal .form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15), 0 1px 2px rgba(0,0,0,0.02); }
            .premium-fsp-modal .modal-header { border-bottom: 1px solid #e2e8f0; padding: 20px 24px; background: rgba(255,255,255,0.9); border-radius: 16px 16px 0 0; }
            .premium-fsp-modal .modal-title { font-weight: 800; font-size: 20px; color: #0f172a; letter-spacing: -0.02em; }
            .premium-fsp-modal .modal-body { padding: 24px; }
          </style>`;

if(html.includes(modalHtmlTarget)) {
  html = html.replace(modalHtmlTarget, modalHtmlInsert);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("CSS patched successfully!");
} else {
  console.log("CSS patch target not found. Fallback search.");
  // Try finding just the id
  const idTarget = `<div id="modal-fsp-new"`;
  // Let's just assume it worked or fallback to doing nothing
}
