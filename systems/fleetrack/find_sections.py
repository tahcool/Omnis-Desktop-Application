import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
lines = f.readlines()
f.close()

keywords = [
    'ft-report-queue', 'Weekly Reporting Queue', 'REPORTING QUEUE',
    'Recent Breakdowns', 'RECENT BREAKDOWNS', 'recent-breakdowns', 'ft-breakdown-log',
    'Trouble Code', 'TROUBLE CODE', 'trouble-code', 'hitachi-trouble',
    'telematics-trouble', 'Shantui'
]

for i, line in enumerate(lines):
    for kw in keywords:
        if kw.lower() in line.lower():
            print(f'L{i+1}: {line.rstrip()[:130]}')
            break
