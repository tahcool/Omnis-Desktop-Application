import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
content = f.read()
f.close()

OLD_ISR_CALL = """        const res = await callFrappe(
          'https://fleetrack.machinery-exchange.com/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          {}
        );
        const raw = res?.message?.data ?? (Array.isArray(res?.message) ? res.message : []);"""

NEW_ISR_CALL = """        const filters = {
          region:   document.getElementById('isr-region')?.value  || '',
          customer: document.getElementById('isr-customer')?.value || '',
          model:    document.getElementById('isr-model')?.value   || '',
        };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const raw = res?.message?.data ?? (Array.isArray(res?.message) ? res.message : []);"""

if OLD_ISR_CALL in content:
    content = content.replace(OLD_ISR_CALL, NEW_ISR_CALL, 1)
    print('ISR callFrappe fixed OK')
else:
    print('ERROR: ISR call pattern not found')
    # Show what's there
    idx = content.find('async function loadRptIsr')
    print(repr(content[idx:idx+600]))

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8')
f.write(content)
f.close()
print('File saved.')
