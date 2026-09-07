# -*- coding: utf-8 -*-
import os
import re
import subprocess

file_path = r'c:\Users\Administrator\omnis\systems\medicals\index.html'

# Get the previous version of index.html
subprocess.run(['git', 'show', 'HEAD:systems/medicals/index.html'], stdout=open('temp_old.html', 'w', encoding='utf-8'))

with open('temp_old.html', 'r', encoding='utf-8') as f:
    old_html = f.read()

# Extract the Medical News block
match = re.search(r'(<!-- MEDICAL NEWS & UPDATES -->.*?)\s*</div>\s*</div>\s*<!-- PATIENT DIRECTORY VIEW -->', old_html, re.DOTALL)
if match:
    news_block = match.group(1)
    # The regex might grab too much. Let's find exactly the block.
    # It starts with <!-- MEDICAL NEWS & UPDATES --> and ends with the </script> for window.fetchMedicalNews
    match2 = re.search(r'(<!-- MEDICAL NEWS & UPDATES -->.*?<script>.*?</script>)', old_html, re.DOTALL)
    if match2:
        news_block = match2.group(1)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            current_html = f.read()
            
        # We want to insert it right after the Appointments Calendar.
        # The Appointments Calendar block looks like this:
        #             </div>
        #           </div>
        
        pattern = r'(<!-- APPOINTMENTS CALENDAR -->.*?</button>\s*</div>\s*<div id="dash-appointments-grid".*?</div>\s*</div>\s*</div>\s*</div>)'
        
        current_match = re.search(pattern, current_html, re.DOTALL)
        if current_match:
            cal_block = current_match.group(1)
            # Actually, to be safe, I'll just append it right before <!-- PATIENT DIRECTORY VIEW -->
            # since it's the next view.
            
            # Wait, the views are nested? No, PATIENT DIRECTORY VIEW is a new view. 
            # The dashboard view ends before PATIENT DIRECTORY VIEW.
            
            new_html = current_html.replace('<!-- PATIENT DIRECTORY VIEW -->', '\n' + news_block + '\n\n          <!-- PATIENT DIRECTORY VIEW -->')
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_html)
            print("Restored Medical News block.")
        else:
            print("Could not find calendar block to insert after. Inserting before PATIENT DIRECTORY VIEW.")
            new_html = current_html.replace('<!-- PATIENT DIRECTORY VIEW -->', '\n          ' + news_block + '\n\n          <!-- PATIENT DIRECTORY VIEW -->')
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_html)
            print("Restored Medical News block.")
    else:
        print("Could not extract exact news block.")
else:
    print("Could not extract news block.")
