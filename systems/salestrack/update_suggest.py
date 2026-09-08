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
                const res = await window\.callFrappeSequenced\(CURRENT_SYSTEM\.baseUrl, "powerstar_salestrack\.omnis_dashboard\." \+ methodName, \{ txt: val \}\);
                const data = res\.message \|\| res \|\| \[\];"""

new_fetch = r"""        const fetchSuggestions = async (val) => {
            if (!val || val.length < 1) {
                list.classList.add('hidden');
                return;
            }

            try {
                let data = [];
                if (window.supabase) {
                    if (methodName === "search_sales_person_for_omnis") {
                        const { data: resData, error } = await window.supabase
                            .from("omnis_sales_persons")
                            .select("name")
                            .ilike("name", `%${val}%`)
                            .limit(10);
                        if (!error && resData) {
                            data = resData.map(r => ({ value: r.name, description: r.name }));
                        }
                    } else if (methodName === "search_customer_for_omnis") {
                        const { data: resData, error } = await window.supabase
                            .from("customers")
                            .select("customer_name")
                            .ilike("customer_name", `%${val}%`)
                            .limit(10);
                        if (!error && resData) {
                            const unique = [...new Set(resData.map(r => r.customer_name))].filter(Boolean);
                            data = unique.map(name => ({ value: name, description: name }));
                        }
                    } else if (methodName === "search_item_for_omnis") {
                        const { data: resData, error } = await window.supabase
                            .from("stock_inventory")
                            .select("model, brand")
                            .ilike("model", `%${val}%`)
                            .limit(10);
                        if (!error && resData) {
                            const unique = [...new Set(resData.map(r => r.model))].filter(Boolean);
                            data = unique.map(model => {
                                const brand = resData.find(r => r.model === model)?.brand || '';
                                return { value: model, description: model, details: brand };
                            });
                        }
                    }
                }
"""

js = re.sub(old_fetch, new_fetch, js)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(js)
    
print("Updated fetchSuggestions")
