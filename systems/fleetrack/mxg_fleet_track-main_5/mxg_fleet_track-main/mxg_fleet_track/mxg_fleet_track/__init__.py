import frappe


def get_users_with_role(role):
    """Returns a list of users with the given role"""
    users = []
    for user in frappe.db.get_all("User", fields=["name", "full_name"]):
        roles = frappe.get_roles(user["name"])
        if role in roles:
            users.append(user)
    return users
