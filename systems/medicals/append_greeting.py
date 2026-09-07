# -*- coding: utf-8 -*-
import os

file_path = r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js'

with open(file_path, 'r', encoding='utf-8') as f:
    js = f.read()

greeting_logic = '''
// Format and display the user's name in the greeting
document.addEventListener('DOMContentLoaded', function() {
    const userEmail = localStorage.getItem('omnisUser');
    const welcomeEl = document.getElementById('welcome-greeting');
    if (userEmail && welcomeEl) {
        // e.g. "takunda@machineryexchange.co.zw" -> "Takunda"
        // e.g. "john.doe@machineryexchange.co.zw" -> "John Doe"
        let namePart = userEmail.split('@')[0];
        let parts = namePart.split('.');
        let formattedName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
        welcomeEl.innerHTML = "Good morning, " + formattedName + "!";
    }
});
'''

with open(file_path, 'a', encoding='utf-8') as f:
    f.write("\n" + greeting_logic)
print("Appended greeting logic to medicals_logic.js")
