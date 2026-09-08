import re

file_path = r"c:\Users\Administrator\omnis\systems\salestrack\create_quotation_logic.js"
with open(file_path, "r", encoding="utf-8") as f:
    js = f.read()

old_onSelect = r"""                const adaptedOnSelect = onSelect ? \(mappedItem\) => \{
                    // setupSupabaseSuggestions returns a mappedItem with value, description, etc.
                    // We pass it to the original onSelect
                    onSelect\(mappedItem\.value, mappedItem\);
                \} : null;"""
                
new_onSelect = r"""                const adaptedOnSelect = (mappedItem) => {
                    if (onSelect) {
                        onSelect(mappedItem.value, mappedItem);
                    } else {
                        // Quick Create fields usually don't provide onSelect, they rely on setupSupabaseSuggestions autofill.
                        // However, we want to auto-fill the quote title when Customer is selected.
                        if (methodName === "search_customer_for_omnis" && input.id === "qq-customer") {
                            const titleEl = document.getElementById('qq-title');
                            if (titleEl && !titleEl.value.trim()) {
                                titleEl.value = `${mappedItem.value} - Quotation`;
                            }
                        }
                    }
                };"""

js = re.sub(old_onSelect, new_onSelect, js)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(js)
    
print("Updated adaptedOnSelect for title autofill")
