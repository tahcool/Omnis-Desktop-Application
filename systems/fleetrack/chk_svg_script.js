const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Check if the SVG template literal has </script> inside it
const svgIdx = c.indexOf('MACHINE_PLACEHOLDER_SVG');
const chunk = c.substring(svgIdx, svgIdx+500);
const hasScript = chunk.indexOf('</script>');
console.log('SVG literal has </script>:', hasScript >= 0);
console.log(JSON.stringify(chunk.substring(0,300)));
// This is why block 4's regex capture is wrong - the regex stops at </script> inside the SVG
// This is a pre-existing issue - the syntax_check regex is wrong, not the actual file
// Let's verify the actual browser would see it fine by checking with a smarter parse
