import frappe
from frappe.utils import now_datetime
import json
import base64

class WhatsAppGateway:
    def __init__(self):
        self.session_started = False
        # In a real "built-our-own" scenario, this would interface with a 
        # service like a local Node.js app running whatsapp-web.js or a 
        # Python browser controller.
        
    def get_pairing_qr(self):
        """Returns a Base64 QR code for pairing."""
        # Guaranteed valid 100x100 white square with a black border as a placeholder
        mock_qr_data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkAQMAAABKLAcXAAAABlBMVEUAAAD///+l2Z/dAAAAAXRSTlMAQObYZgAAACNJREFUOMtjYBgFoyEwGkIDYDSMBsBoGA2A0TAaAqMhMBoCABU3AAnS699DAAAAAElFTkSuQmCC"
        return mock_qr_data

    def get_status(self):
        """Checks the connection status."""
        return {
            "connected": self.session_started,
            "session_id": "omnis-main-session",
            "linked_number": "263777000000" if self.session_started else None
        }

    def send_whatsapp(self, recipient, message):
        """Sends a message to a specific recipient."""
        if not recipient:
            return {"status": "error", "message": "No recipient provided"}
            
        # Clean number
        clean_number = ''.join(filter(str.isdigit, str(recipient)))
        if not clean_number.startswith('263'):
            clean_number = '263' + clean_number[-9:]
            
        print(f"[WA Gateway] Sending to {clean_number}: {message[:50]}...")
        
        # Real implementation would call the browser bridge here
        return {"status": "success", "message_id": f"wa_{now_datetime().timestamp()}"}

# Global instances (conceptual)
_gateway = WhatsAppGateway()

@frappe.whitelist(allow_guest=True)
def get_whatsapp_pairing_qr():
    return {"qr": _gateway.get_pairing_qr()}

@frappe.whitelist(allow_guest=True)
def check_whatsapp_status():
    return _gateway.get_status()

def dispatch_whatsapp(recipient, message):
    return _gateway.send_whatsapp(recipient, message)
