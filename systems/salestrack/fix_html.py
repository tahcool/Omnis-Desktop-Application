import re

file_path = r"c:\Users\Administrator\omnis\systems\salestrack\index.html"
with open(file_path, "r", encoding="utf-8") as f:
    html = f.read()

# Comment out Customer autocomplete
html = html.replace(
    """setupQuickAutocomplete('qq-customer', 'qq-customer-suggest', 'Customer', 'customer_name', (val) => {""",
    """// setupQuickAutocomplete('qq-customer', 'qq-customer-suggest', 'Customer', 'customer_name', (val) => {"""
)
html = html.replace(
    """      document.getElementById('qq-customer').value = val;\n      const titleEl = document.getElementById('qq-title');\n      if (titleEl && !titleEl.value.trim()) {\n        titleEl.value = `${val} - Quotation`;\n      }\n    });""",
    """//       document.getElementById('qq-customer').value = val;\n//       const titleEl = document.getElementById('qq-title');\n//       if (titleEl && !titleEl.value.trim()) {\n//         titleEl.value = `${val} - Quotation`;\n//       }\n//     });"""
)

# Comment out Salesperson autocomplete
html = html.replace(
    """    setupQuickAutocomplete('qq-salesperson', 'qq-salesperson-suggest', 'Sales Person', 'sales_person_name', (val) => {\n      document.getElementById('qq-salesperson').value = val;\n    });""",
    """//     setupQuickAutocomplete('qq-salesperson', 'qq-salesperson-suggest', 'Sales Person', 'sales_person_name', (val) => {\n//       document.getElementById('qq-salesperson').value = val;\n//     });"""
)

# Comment out Item autocomplete
html = html.replace(
    """    setupQuickAutocomplete('qq-item', 'qq-item-suggest', 'Item', 'item_code', (val) => {\n      document.getElementById('qq-item').value = val;\n    });""",
    """//     setupQuickAutocomplete('qq-item', 'qq-item-suggest', 'Item', 'item_code', (val) => {\n//       document.getElementById('qq-item').value = val;\n//     });"""
)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(html)
    
print("Commented out old setupQuickAutocomplete bindings in index.html")
