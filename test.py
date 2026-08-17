import requests
import json
import urllib.parse
FRAPPE_URL = 'https://salestrack.powerstar.co.zw'
HEADERS = {'Authorization': 'token 0c14b2d12db200d:48c96c56b62fc92'}
fid = '"Future Focus"-220626-4208'
r = requests.get(f'{FRAPPE_URL}/api/resource/FMB Report/{urllib.parse.quote(fid)}', headers=HEADERS)
if r.status_code == 200:
    data = r.json().get('data', {})
    machines = data.get('machines', [{}])
    print(json.dumps(machines[0], indent=2))
else:
    print(f"Error {r.status_code}: {r.text}")
