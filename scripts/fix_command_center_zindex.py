import os

path = 'C:/Users/Administrator/omnis/systems/salestrack/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# The target line
oldList = '["view-rental-defects","view-rental-fleet","view-fleet-manager","view-customer-profiles","view-psv","view-cdv","view-marketing","view-ft-defect-queue","view-certificates"]'
newList = '["view-rental-defects","view-rental-fleet","view-fleet-manager","view-customer-profiles","view-psv","view-cdv","view-marketing","view-ft-defect-queue","view-certificates","view-command-center"]'

if oldList in html:
    html = html.replace(oldList, newList)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Fixed z-index bug!")
else:
    print("Could not find list in index.html")
