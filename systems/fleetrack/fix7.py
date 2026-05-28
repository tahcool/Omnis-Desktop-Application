with open(r'c:\Users\Administrator\omnis\systems\fleetrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Split by LF (not CRLF) since the file may have been written without CR
lines_lf = content.split('\n')
lines_cr = content.split('\r\n')
print('Lines (LF split):', len(lines_lf))
print('Lines (CRLF split):', len(lines_cr))

# Use whichever split gives more lines
lines = lines_lf if len(lines_lf) > len(lines_cr) else lines_cr
sep = '\n' if len(lines_lf) > len(lines_cr) else '\r\n'
print('Using separator:', repr(sep), '| Total lines:', len(lines))

# Find the line with the broken script tag
broken_idx = None
for i, line in enumerate(lines):
    if 'window.onload=()=>window.print()' in line and 'script>' in line:
        print(f'Found at line {i+1}: {repr(line[:120])}')
        broken_idx = i
        break

if broken_idx is not None:
    old_line = lines[broken_idx]
    # Safest fix: replace <script> with < and build it via concatenation in the JS string
    # The line is inside a template literal backtick string
    # Change:  <script>window.onload=()=>window.print();<\/script>
    # To:      \x3cscript>window.onload=()=>window.print();\x3c/script>
    new_line = old_line.replace('<script>window.onload=()=>window.print();<\\/script>', 
                                 '\\x3cscript>window.onload=()=>window.print();\\x3c/script>')
    lines[broken_idx] = new_line
    print('Fixed line:', repr(new_line[:120]))
    with open(r'c:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8') as f:
        f.write(sep.join(lines))
    print('Saved!')
else:
    print('Could not find target line')
    # Search for any line with <\/script> 
    for i, line in enumerate(lines):
        if '<\\/script>' in line or 'window.print()' in line:
            print(f'  Nearby at line {i+1}: {repr(line[:100])}')
