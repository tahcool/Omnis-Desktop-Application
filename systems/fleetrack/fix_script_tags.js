const fs = require("fs");
const path = "c:/Users/Administrator/omnis/systems/fleetrack/index.html";
let html = fs.readFileSync(path, "utf8");

// Line 12410 contains this inside a template literal:
//   <script>window.onload=()=>window.print();<\/script>
// The <\/script> ends the outer <script> block in the browser.
// Fix: split it into <" + "/script> format

// The exact line (in the template literal, inside win.document.write):
const broken1 = "`\n        <script>window.onload=()=>window.print();<\\/script>\n        </body></html>`";
const fixed1  = '`\n        <scr`+`ipt>window.onload=()=>window.print();</scr`+`ipt>\n        </body></html>`';

// Try simple replacement of just that tag
const broken2 = "<script>window.onload=()=>window.print();<\\/script>";
const fixed2  = '<scr`+`ipt>window.onload=()=>window.print();</scr`+`ipt>';

// Let's do a targeted line-by-line replacement
const lines = html.split("\r\n");
let fixed = 0;
for (let i = 0; i < lines.length; i++) {
  const orig = lines[i];
  // Fix 1: <\/script> inside template literals (line 12410)
  if (orig.includes("<\\/script>") && (orig.includes("window.onload") || orig.includes("<script>"))) {
    // Replace <script> with <scr"+\"ipt> and <\/script> with <\"+\"/script>
    lines[i] = orig
      .replace(/<script>/g, '<" + "script>')
      .replace(/<\\/script>/g, '<" + "/script>');
    console.log("Fixed line", i+1, ":", lines[i].trim().substring(0, 100));
    fixed++;
  }
}

if (fixed === 0) {
  console.log("No replacements made - printing line 12409 to 12412:");
  for (let i = 12408; i <= 12412; i++) {
    console.log("Line", i+1, ":", JSON.stringify(lines[i]));
  }
} else {
  fs.writeFileSync(path, lines.join("\r\n"), "utf8");
  console.log("Done.", fixed, "lines fixed.");
}
