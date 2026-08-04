import sys

def parse_html():
    with open('systems/fleetrack/index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    start = html.find('id="db-create-modal-overlay"')
    if start == -1:
        print("Modal not found")
        return
        
    end = html.find('<!-- END CREATE BREAKDOWN MODAL -->', start)
    if end == -1:
        end = html.find('</div>', start + 4000) + 1000 # Rough guess
        
    modal_html = html[start:end]
    print(modal_html[-1000:]) # Just print the end to see the buttons

if __name__ == "__main__":
    parse_html()
