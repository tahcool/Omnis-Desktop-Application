import re

file_path = r"c:\Users\Administrator\omnis\systems\salestrack\create_quotation_logic.js"
with open(file_path, "r", encoding="utf-8") as f:
    js = f.read()

old_fetch = r"""        const fetchSuggestions = async \(val\) => \{
            if \(\!val \|\| val\.length < 1\) \{
                list\.classList\.add\('hidden'\);
                return;
            \}

            try \{
                let data = \[\];
                if \(window\.supabase\) \{
"""

new_fetch = r"""        const fetchSuggestions = async (val) => {
            if (!val || val.length < 1) {
                list.classList.add('hidden');
                return;
            }

            try {
                console.log(`[Suggest] Fetching ${methodName} for:`, val);
                let data = [];
                if (window.supabase) {
                    console.log("[Suggest] window.supabase is available.");
"""

js = re.sub(old_fetch, new_fetch, js)


old_sales = r"""                    if \(methodName === "search_sales_person_for_omnis"\) \{
                        const \{ data: resData, error \} = await window\.supabase"""
new_sales = r"""                    if (methodName === "search_sales_person_for_omnis") {
                        console.log("[Suggest] Querying omnis_sales_persons...");
                        const { data: resData, error } = await window.supabase"""
js = re.sub(old_sales, new_sales, js)

old_sales_end = r"""                        if \(\!error && resData\) \{
                            data = resData\.map\(r => \(\{ value: r\.name, description: r\.name \}\)\);
                        \}"""
new_sales_end = r"""                        if (error) console.error("[Suggest] Error querying omnis_sales_persons:", error);
                        if (resData) console.log("[Suggest] resData omnis_sales_persons:", resData);
                        if (!error && resData) {
                            data = resData.map(r => ({ value: r.name, description: r.name }));
                        }"""
js = re.sub(old_sales_end, new_sales_end, js)


old_cust_end = r"""                        if \(\!error && resData\) \{
                            const unique = \[\.\.\.new Set\(resData\.map\(r => r\.customer_name\)\)\]\.filter\(Boolean\);
                            data = unique\.map\(name => \(\{ value: name, description: name \}\)\);
                        \}"""
new_cust_end = r"""                        if (error) console.error("[Suggest] Error querying customers:", error);
                        if (resData) console.log("[Suggest] resData customers:", resData);
                        if (!error && resData) {
                            const unique = [...new Set(resData.map(r => r.customer_name))].filter(Boolean);
                            data = unique.map(name => ({ value: name, description: name }));
                        }"""
js = re.sub(old_cust_end, new_cust_end, js)


old_item_end = r"""                        if \(\!error && resData\) \{
                            const unique = \[\.\.\.new Set\(resData\.map\(r => r\.model\)\)\]\.filter\(Boolean\);
                            data = unique\.map\(model => \{
                                const brand = resData\.find\(r => r\.model === model\)\?\.brand \|\| '';
                                return \{ value: model, description: model, details: brand \};
                            \}\);
                        \}"""
new_item_end = r"""                        if (error) console.error("[Suggest] Error querying stock_inventory:", error);
                        if (resData) console.log("[Suggest] resData stock_inventory:", resData);
                        if (!error && resData) {
                            const unique = [...new Set(resData.map(r => r.model))].filter(Boolean);
                            data = unique.map(model => {
                                const brand = resData.find(r => r.model === model)?.brand || '';
                                return { value: model, description: model, details: brand };
                            });
                        }"""
js = re.sub(old_item_end, new_item_end, js)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(js)
    
print("Updated fetchSuggestions with logs")
