with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'rb') as f:
    raw = f.read()

content = raw.decode('utf-8')
lines = content.split('\n')

target_idx = None
for i, line in enumerate(lines):
    if 'const subject' in line and '[NEW ORDER]' in line:
        target_idx = i
        print(f"Found at line {i+1}: {repr(line[:100])}")
        break

if target_idx is not None:
    # Build the replacement line using chr() to avoid any escaping issues
    dollar = chr(36)  # $
    backtick = chr(96)  # `
    cr = chr(13)        # \r

    subject_line = (
        "      const subject = " + backtick +
        "[NEW ORDER] " + dollar + "{payload.customer || 'Customer'} | " +
        dollar + "{payload.oem || ''} " + dollar + "{payload.model || ''} | " +
        dollar + "{brandName}" + backtick + ";" + cr
    )

    print(f"New line: {repr(subject_line)}")
    lines[target_idx] = subject_line

    new_content = '\n'.join(lines)
    with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'wb') as f:
        f.write(new_content.encode('utf-8'))
    print("Saved successfully.")
else:
    print("ERROR: Target line not found!")
