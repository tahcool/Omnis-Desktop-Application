with open(r'c:\Users\Administrator\omnis\systems\fleetrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print('Total lines:', len(lines))

# Find line 12973
target_idx = 12972  # 0-indexed
line = lines[target_idx]
print('Line 12973:', repr(line[:150]))

# The line is inside a JS string concatenation (not a template literal)
# It uses: "<script>window.onload=function(){window.print();};
# and closes with: <" + "/script>"  (already split)
# But the OPEN <script> tag is still problematic!

# Fix: replace <script> with <scr\"+\"ipt>  (split the open tag too)
if '<script>window.onload=function()' in line:
    new_line = line.replace(
        '<script>window.onload=function(){window.print();};',
        '<scr"+\"ipt>window.onload=function(){window.print();};'
    )
    lines[target_idx] = new_line
    print('Fixed to:', repr(new_line[:150]))
    with open(r'c:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('Saved!')
else:
    print('Pattern not found in line 12973')
    print('Full line:', repr(line))
