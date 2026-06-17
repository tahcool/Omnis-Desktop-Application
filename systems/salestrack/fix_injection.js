const fs = require('fs');
const path = require('path');

const file = path.join('C:', 'Users', 'Administrator', 'omnis', 'systems', 'salestrack', 'index.html');
let content = fs.readFileSync(file, 'utf8');

// 1. Add + New Handover Button
// The regex finds the exact search container
const regexSearch = /(<div style="position:relative;\s*width:\s*250px;">\s*<i class="fas fa-search")/g;
const replaceSearch = `<button onclick="window.openNewAftersalesForm()" style="height:42px; padding:0 16px; background:#1e293b; color:white; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); display:flex; align-items:center; gap:8px; transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#1e293b'"><i class="fas fa-plus"></i> New Handover</button>\n          $1`;

if (!content.includes("openNewAftersalesForm()\" style=\"height:42px")) {
    content = content.replace(regexSearch, replaceSearch);
    console.log("Injected + New Handover button.");
} else {
    console.log("+ New Handover button already injected.");
}

// Check if Send Email button was injected
const emailBtnCheck = `id="as-email-btn"`;
if (!content.includes(emailBtnCheck)) {
    console.log("Email button not found, injecting now...");
    const regexEmail = /(<div style="display:flex;\s*gap:10px;">\s*<button id="as-save-btn")/g;
    const replaceEmail = `<div style="display:flex; gap:10px;">
          <button id="as-email-btn" onclick="window.sendAftersalesEmail()" style="flex:1; height:48px; background:#3b82f6; color:white; border:none; border-radius:10px; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer; box-shadow:0 10px 15px -3px rgba(59,130,246,0.3); transition:all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
            <i class="fas fa-paper-plane"></i> Email Update
          </button>\n          <button id="as-save-btn"`;
    content = content.replace(regexEmail, replaceEmail);
} else {
    console.log("Email button already injected.");
}

fs.writeFileSync(file, content, 'utf8');
console.log("Fix completed.");
