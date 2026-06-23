import os

file_path = "C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Sales Team Leaderboard
target_leaderboard = """                            <thead>
                                <tr style="border-bottom:1px solid #e2e8f0; color:#94a3b8; font-size:11px; text-transform:uppercase;">
                                    <th style="padding:8px 10px; text-align:left; font-weight:700;">Rep</th>
                                    <th style="padding:8px 10px; text-align:left; font-weight:700;">Quotes</th>
                                    <th style="padding:8px 10px; text-align:left; font-weight:700;">Logged</th>
                                    <th style="padding:8px 10px; text-align:left; font-weight:700;">Rate</th>
                                </tr>
                            </thead>"""
rep_leaderboard = """                            <thead>
                                <tr style="background:#991b1b; color:white; font-size:11px; text-transform:uppercase;">
                                    <th style="padding:12px 16px; text-align:left; font-weight:800; border-top-left-radius:6px; border-bottom-left-radius:6px;">Rep</th>
                                    <th style="padding:12px 16px; text-align:left; font-weight:800;">Quotes</th>
                                    <th style="padding:12px 16px; text-align:left; font-weight:800;">Logged</th>
                                    <th style="padding:12px 16px; text-align:left; font-weight:800; border-top-right-radius:6px; border-bottom-right-radius:6px;">Rate</th>
                                </tr>
                            </thead>
                            <tbody style="display:block; height:8px;"></tbody>"""
content = content.replace(target_leaderboard, rep_leaderboard)

# 2. Global Due Quotes
target_due = """                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <tbody>"""
rep_due = """                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <thead>
                            <tr style="background:#991b1b; color:white; font-size:11px; text-transform:uppercase;">
                                <th style="padding:12px 16px; text-align:left; font-weight:800; border-top-left-radius:6px; border-bottom-left-radius:6px; width:30%;">Quote Name</th>
                                <th style="padding:12px 16px; text-align:left; font-weight:800; width:30%;">Sales Person</th>
                                <th style="padding:12px 16px; text-align:left; font-weight:800; width:20%;">Stage</th>
                                <th style="padding:12px 16px; text-align:right; font-weight:800; border-top-right-radius:6px; border-bottom-right-radius:6px; width:20%;">Due Date</th>
                            </tr>
                        </thead>
                        <tbody style="display:block; height:8px;"></tbody>
                        <tbody>"""
content = content.replace(target_due, rep_due)

# 3. Manager Signoffs
target_approvals = """                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <tbody>"""
rep_approvals = """                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:#991b1b; color:white; font-size:11px; text-transform:uppercase;">
                            <th style="padding:12px 16px; text-align:left; font-weight:800; border-top-left-radius:6px; border-bottom-left-radius:6px;">Quote Details</th>
                            <th style="padding:12px 16px; text-align:left; font-weight:800;">Manager Notes</th>
                            <th style="padding:12px 16px; text-align:right; font-weight:800; border-top-right-radius:6px; border-bottom-right-radius:6px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody style="display:block; height:8px;"></tbody>
                    <tbody>"""
content = content.replace(target_approvals, rep_approvals)

# 4. Dispatch Logs
target_emails = """            : `<table style="width:100%; border-collapse:collapse; font-size:13px;">
                <tbody>"""
rep_emails = """            : `<table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                    <tr style="background:#991b1b; color:white; font-size:11px; text-transform:uppercase;">
                        <th style="padding:12px 16px; text-align:left; font-weight:800; border-top-left-radius:6px; border-bottom-left-radius:6px;">Recipient</th>
                        <th style="padding:12px 16px; text-align:left; font-weight:800;">Subject</th>
                        <th style="padding:12px 16px; text-align:left; font-weight:800;">Date Dispatched</th>
                        <th style="padding:12px 16px; text-align:left; font-weight:800; border-top-right-radius:6px; border-bottom-right-radius:6px;">Status</th>
                    </tr>
                </thead>
                <tbody style="display:block; height:8px;"></tbody>
                <tbody>"""
content = content.replace(target_emails, rep_emails)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Tables styled successfully!")
