with open(r'c:\Users\Administrator\omnis\systems\fleetrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\r\n')
print('Line 12410:', repr(lines[12409]))

# The line contains: <script>window.onload=()=>window.print();<\/script>
# inside a template literal. We must prevent the HTML parser from seeing </script>
# Replace the embedded script tags in the template literal

target_line = lines[12409]
if '<script>' in target_line and 'window.onload' in target_line:
    # Replace <script> with <scr"+\"ipt> and <\/script> with </scr"+\"ipt>
    fixed_line = target_line.replace('<script>', '<scr"+\\"ipt>').replace('<\\/script>', '</scr"+\\"ipt>')
    lines[12409] = fixed_line
    print('Fixed to:', repr(fixed_line))
    with open(r'c:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8') as f:
        f.write('\r\n'.join(lines))
    print('File saved.')
else:
    print('Target line not matched. Content:', repr(target_line))
