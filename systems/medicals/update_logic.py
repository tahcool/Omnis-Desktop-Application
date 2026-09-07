import os

file_path = r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js'

with open(file_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Change colspan 8 to 9
js = js.replace('colspan="8"', 'colspan="9"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(js)
print('Logic update complete')
