const fs = require("fs");
const html = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html", "utf8");
const lines = html.split("\r\n");

// Find ALL <script> and </script> tags with line numbers
const events = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/<script\b/i.test(l)) events.push({ type: "open", line: i+1, content: l.trim().substring(0,80) });
  if (/<\/script>/i.test(l)) events.push({ type: "close", line: i+1, content: l.trim().substring(0,80) });
}

// Walk through tracking depth
let depth = 0;
for (const ev of events) {
  if (ev.type === "open") {
    depth++;
    console.log(`[OPEN  depth=${depth}] line ${ev.line}: ${ev.content}`);
  } else {
    console.log(`[CLOSE depth=${depth}] line ${ev.line}: ${ev.content}`);
    depth--;
    if (depth < 0) {
      console.error("  *** EXTRA CLOSE TAG - depth went negative! ***");
      depth = 0;
    }
  }
}
console.log("\nFinal depth:", depth, "(should be 0)");
