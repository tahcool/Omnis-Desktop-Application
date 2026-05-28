"""
Fix: Remove view HTML that was wrongly injected inside a <script> block,
then re-inject correctly before the REAL </body> tag (the last one in the file).
"""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
content = f.read()
f.close()

# The injected view HTML starts with the first <div id="view-rpt-machine-reg"
# and ends just before the misplaced </body> tag that was put AFTER it
# Let's find the START of the wrongly injected block

START_MARKER = '<div id="view-rpt-machine-reg"'
END_MARKER   = '<div id="view-rpt-wwu"'

start_idx = content.find(START_MARKER)
if start_idx == -1:
    print('ERROR: Could not find start of injected view HTML')
    sys.exit(1)

# Find the end of the wwu view (the last injected view)
wwu_idx  = content.find(END_MARKER)
if wwu_idx == -1:
    print('ERROR: Could not find view-rpt-wwu')
    sys.exit(1)

# Find the closing </div> of the wwu view (it will be the one that closes it)
# wwu view structure: <div id="view-rpt-wwu" class="view-page hidden"> ... </div>
# We need to find the matching </div>
search_from = wwu_idx
depth = 0
i = search_from
wwu_end = -1
while i < len(content) - 5:
    if content[i:i+4] == '<div':
        depth += 1
        i += 4
    elif content[i:i+6] == '</div>':
        depth -= 1
        if depth == 0:
            wwu_end = i + 6
            break
        i += 6
    else:
        i += 1

if wwu_end == -1:
    print('ERROR: Could not find end of wwu view')
    sys.exit(1)

# The wrongly injected block is from start_idx to wwu_end
# BUT we also need to include any whitespace/newlines BEFORE start_idx that are
# part of the injection (go back to the previous newline)
block_start = content.rfind('\n', 0, start_idx) + 1  # Start of the line containing the first div

wrong_block = content[block_start:wwu_end]
print(f'Found wrong block: chars {block_start} to {wwu_end} ({wwu_end - block_start} bytes)')
print(f'First 100 chars: {wrong_block[:100]!r}')
print(f'Last 100 chars:  {wrong_block[-100:]!r}')

# Confirm it's inside a script block (i.e., the chars around it don't look like HTML)
# Check the 200 chars before it
context_before = content[max(0, block_start-200):block_start]
print(f'\nContext before block: {context_before[-100:]!r}')

# Extract the view HTML block to re-use
view_html = wrong_block.strip()

# Remove the wrong block from the content
content_fixed = content[:block_start] + content[wwu_end:]
print(f'\nRemoved wrong block. Content length: {len(content)} → {len(content_fixed)}')

# Verify we didn't break anything — make sure view-rpt-gdr is gone
still_there = 'id="view-rpt-gdr"' in content_fixed
print(f'view-rpt-gdr still in content after removal: {still_there}')

if still_there:
    print('ERROR: Multiple copies of the view HTML exist. Manual cleanup needed.')
    sys.exit(1)

# Now find the REAL </body> tag (the last occurrence in the file)
last_body_close = content_fixed.rfind('</body>')
if last_body_close == -1:
    print('ERROR: Could not find </body> in fixed content')
    sys.exit(1)
print(f'\nReal </body> at char: {last_body_close} (of {len(content_fixed)})')

# Inject the view HTML correctly before the real </body>
# Wrap in a clear comment marker
injection = '\n\n  <!-- ═══ NATIVE STANDALONE REPORT VIEWS ═══ -->\n  ' + view_html + '\n  <!-- ═══ END NATIVE REPORT VIEWS ═══ -->\n\n'
content_final = content_fixed[:last_body_close] + injection + content_fixed[last_body_close:]

# Verify it's now in the right place
gdr_pos     = content_final.find('id="view-rpt-gdr"')
body_close  = content_final.rfind('</body>')
script_last = content_final.rfind('</script>')
print(f'\n=== Final verification ===')
print(f'view-rpt-gdr at char: {gdr_pos}')
print(f'last </script> at char: {script_last}')
print(f'</body> at char: {body_close}')
print(f'GDR is AFTER last </script>: {gdr_pos > script_last}')
print(f'GDR is BEFORE </body>: {gdr_pos < body_close}')

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8')
f.write(content_final)
f.close()
print('\nFile saved OK')
