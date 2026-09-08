import re

file_path = r"c:\Users\Administrator\omnis\systems\salestrack\create_quotation_logic.js"
with open(file_path, "r", encoding="utf-8") as f:
    js = f.read()

# Define regex to capture the entire setupSuggestions function
pattern = r"(\s*function setupSuggestions\(input, list, methodName, onSelect = null\) \{)(.*?)(\n    \}\n)"
match = re.search(pattern, js, re.DOTALL)
if match:
    new_impl = r"""
    function setupSuggestions(input, list, methodName, onSelect = null) {
        if (!input || !list) return;

        if (window.setupSupabaseSuggestions) {
            let table = "", searchFields = "";
            if (methodName === "search_sales_person_for_omnis") {
                table = "omnis_sales_persons";
                searchFields = "name";
            } else if (methodName === "search_customer_for_omnis") {
                table = "customers";
                searchFields = "customer_name";
            } else if (methodName === "search_item_for_omnis") {
                table = "stock_inventory";
                searchFields = "model,brand";
            }
            
            if (table) {
                // Adapt the onSelect to match the old expected signature (val, item)
                const adaptedOnSelect = onSelect ? (mappedItem) => {
                    // setupSupabaseSuggestions returns a mappedItem with value, description, etc.
                    // We pass it to the original onSelect
                    onSelect(mappedItem.value, mappedItem);
                } : null;
                
                window.setupSupabaseSuggestions(input, list, table, searchFields, adaptedOnSelect);
                return;
            }
        }

        // Fallback (should not be reached if table mapped)
        console.warn("setupSupabaseSuggestions not available or table not mapped for:", methodName);
    }
"""
    js = js[:match.start()] + new_impl + js[match.end():]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(js)
    print("Replaced setupSuggestions")
else:
    print("Could not find setupSuggestions")
