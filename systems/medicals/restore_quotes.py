# -*- coding: utf-8 -*-
import os

file_path = r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js'

with open(file_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the greeting logic to also include the date and quote
old_logic = '''document.addEventListener('DOMContentLoaded', function() {
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
});'''

new_logic = '''document.addEventListener('DOMContentLoaded', function() {
    const userEmail = localStorage.getItem('omnisUser');
    const welcomeEl = document.getElementById('welcome-greeting');
    if (userEmail && welcomeEl) {
        let namePart = userEmail.split('@')[0];
        let parts = namePart.split('.');
        let formattedName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
        welcomeEl.innerHTML = "Good morning, " + formattedName + "!";
    }
    
    const dateSubtitle = document.getElementById('welcome-date-subtitle');
    if (dateSubtitle) {
        const today = new Date();
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        const dateString = "Today is " + today.toLocaleDateString('en-US', options) + ".";
        const quotes = [
            {text: "Medicine is a science of uncertainty and an art of probability.", author: "William Osler"},
            {text: "Wherever the art of Medicine is loved, there is also a love of Humanity.", author: "Hippocrates"},
            {text: "The good physician treats the disease; the great physician treats the patient.", author: "William Osler"}
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        dateSubtitle.innerHTML = ${dateString}<br><span style="font-style:italic; opacity:0.85; font-size:12px; margin-top:6px; display:inline-block;">"" — <strong style="font-weight:600"></strong></span>;
    }
});'''

js = js.replace(old_logic, new_logic)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated greeting logic to include date and quotes.")
