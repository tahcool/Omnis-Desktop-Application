# -*- coding: utf-8 -*-
import os

file_path = r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js'

with open(file_path, 'r', encoding='utf-8') as f:
    js = f.read()

search = '''    // 3. Render Monthly Stats
    );
    // Init the live search for Breathalyzer patient'''

replace = '''    // 3. Render Monthly Stats removed
}

// Ensure loadSheData is called on init
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', () => {
            const target = el.getAttribute('data-target');
            if (target === 'view-she') loadSheData();
        });
    });
    // Init the live search for Breathalyzer patient'''

js = js.replace(search, replace)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(js)
print('Fixed syntax error')
