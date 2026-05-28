from frappe.utils.password import get_decrypted_password


def authenticate_aux(pin):
    if str(pin) == get_decrypted_password("Fleetrack Settings", "Fleetrack Settings", "aux_pin", False):
        return True
    return False
