import codecs

with codecs.open('index.html', 'r', 'utf-8') as f:
    c = f.read()

with codecs.open('loadISR_supabase.js', 'r', 'utf-8') as f:
    isr_js = f.read()

# Replace the invalid dash character with a standard hyphen just in case
isr_js = isr_js.replace("\uFFFD", "-").replace("", "-")

idx = c.rfind('</body>')
c = c[:idx] + '<script>\n' + isr_js + '\n</script>\n' + c[idx:]

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(c)

print('Appended loadISR_supabase.js')
