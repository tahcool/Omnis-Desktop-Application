const fs = require('fs');
const readline = require('readline');

async function extract() {
    const stream = fs.createReadStream('C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\57fda3b4-0b69-4a17-bf5e-47ca2a809ea3\\.system_generated\\logs\\transcript_full.jsonl');
    const rl = readline.createInterface({ input: stream });

    let found = false;
    for await (const line of rl) {
        if (line.includes('view-create-quotation') && (line.includes('replace_file_content') || line.includes('multi_replace_file_content'))) {
            try {
                const data = JSON.parse(line);
                if (data.tool_calls) {
                    for (const tc of data.tool_calls) {
                        if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
                            const str = JSON.stringify(tc);
                            if (str.includes('view-create-quotation')) {
                                console.log("FOUND REPLACEMENT");
                                fs.writeFileSync('c:\\Users\\Administrator\\omnis\\systems\\salestrack\\extracted_quotation.json', JSON.stringify(tc, null, 2));
                                found = true;
                            }
                        }
                    }
                }
            } catch (e) {}
        }
    }
    console.log("Done. Found: " + found);
}

extract();
