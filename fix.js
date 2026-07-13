const fs = require('fs');
const path = 'c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html';
let text = fs.readFileSync(path, 'utf-8');

// 1. Fix invocations
text = text.replace('onclick="showStockPipelineForm()"', 'onclick="window.showStockPipelineForm()"');
text = text.replace('onclick="showStockPipelineForm(\\\'${safeName}\\\')" style="font-size: 10px;', 'onclick="window.showStockPipelineForm(\\\'${safeName}\\\')" style="font-size: 10px;');

// 2. Fix function body
const funcStart = '    window.showStockPipelineForm = function (inputData = null) {';
const newFuncStart = `    window.showStockPipelineForm = function (inputData = null) {
      try {
        console.log("[Stock] showStockPipelineForm invoked with data:", inputData);
        if (inputData instanceof Event) inputData = null;
`;
text = text.replace(funcStart, newFuncStart);

const funcEndBlock = `        if (!spFormInited) {
          setupSupabaseSuggestions(document.getElementById('sp-oem'), document.getElementById('sp-oem-suggest'), "brands", "name");
          setupSupabaseSuggestions(document.getElementById('sp-model-input'), document.getElementById('sp-model-suggest'), "products", "item_name,item_code", (selected) => {
            const oemInput = document.getElementById('sp-oem');
            if (selected.brand && oemInput) {
              oemInput.value = selected.brand;
              // Visual feedback
              oemInput.classList.add('flash-attention');
              setTimeout(() => oemInput.classList.remove('flash-attention'), 2000);
            }
          });

          // Customer search for earmarks
          setupSuggestions(document.getElementById('sp-customer-search'), document.getElementById('sp-cust-suggest'), "search_customer_for_omnis", (selected) => {
            window.addSPPotentialCustomer(selected.description || selected.value, selected.phone || "");
          });

          spFormInited = true;
        }
        overlay.style.display = "flex";
      }
    };`;

const newFuncEndBlock = `        if (!spFormInited) {
          window.setupSupabaseSuggestions(document.getElementById('sp-oem'), document.getElementById('sp-oem-suggest'), "brands", "name");
          window.setupSupabaseSuggestions(document.getElementById('sp-model-input'), document.getElementById('sp-model-suggest'), "products", "item_name,item_code", (selected) => {
            const oemInput = document.getElementById('sp-oem');
            if (selected.brand && oemInput) {
              oemInput.value = selected.brand;
              // Visual feedback
              oemInput.classList.add('flash-attention');
              setTimeout(() => oemInput.classList.remove('flash-attention'), 2000);
            }
          });

          // Customer search for earmarks
          window.setupSuggestions(document.getElementById('sp-customer-search'), document.getElementById('sp-cust-suggest'), "search_customer_for_omnis", (selected) => {
            window.addSPPotentialCustomer(selected.description || selected.value, selected.phone || "");
          });

          spFormInited = true;
        }
        overlay.style.display = "flex";
      }
      } catch(err) {
        console.error("ERROR in showStockPipelineForm:", err);
        alert("Error opening form: " + err.message);
      }
    };`;

text = text.replace(funcEndBlock, newFuncEndBlock);

fs.writeFileSync(path, text, 'utf-8');
console.log("Replacement applied successfully.");
