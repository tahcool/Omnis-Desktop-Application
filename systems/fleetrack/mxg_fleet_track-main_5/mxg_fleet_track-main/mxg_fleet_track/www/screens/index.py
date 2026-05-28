import frappe
from frappe.utils.password import get_decrypted_password

no_cache = 1


def get_context(context):
    return context


@frappe.whitelist(allow_guest=True)
def aux_auth(pin):
    if pin == get_decrypted_password("Fleetrack Settings", "Fleetrack Settings", "aux_pin", False):
        return 1
    return 0
