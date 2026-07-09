import sys
import re

outbox_html = """
    <!-- Floating Outbox Manager -->
    <div id="omnis-outbox-manager" style="position:fixed; bottom:20px; right:20px; width:360px; background:#fff; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.15); border:1px solid var(--border); z-index:9999; display:none; flex-direction:column; overflow:hidden; font-family:var(--font-family);">
        <div style="background:var(--accent-blue); color:#fff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:700; font-size:14px; display:flex; align-items:center; gap:8px;">
                <i class="fas fa-paper-plane"></i> Outbox (Pending Sends)
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span id="outbox-count-badge" style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:12px; font-size:12px; font-weight:700;">0</span>
                <button onclick="document.getElementById('omnis-outbox-manager').style.display='none'" style="background:none; border:none; color:#fff; cursor:pointer;"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div id="outbox-list" style="max-height:300px; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px; background:#f8fafc;">
            <!-- Rendered via JS -->
        </div>
    </div>
    
    <!-- Floating Outbox Trigger Button -->
    <div id="outbox-trigger-btn" onclick="document.getElementById('omnis-outbox-manager').style.display='flex'" style="position:fixed; bottom:20px; right:20px; width:50px; height:50px; background:var(--accent-blue); color:#fff; border-radius:25px; display:none; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 4px 12px rgba(29,78,216,0.3); z-index:9998; font-size:20px;">
        <i class="fas fa-paper-plane"></i>
        <span id="outbox-trigger-badge" style="position:absolute; top:-5px; right:-5px; background:var(--accent-red); color:#fff; width:20px; height:20px; border-radius:10px; font-size:11px; display:flex; justify-content:center; align-items:center; font-weight:700;">0</span>
    </div>
"""

outbox_js = """

// ==========================================
// OUTBOX MANAGER (150s Recall System)
// ==========================================
window.OutboxManager = {
    queue: [],
    timer: null,
    recallWindowMs: 150000, // 150 seconds

    init() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.tick(), 1000);
        this.render();
    },

    addToQueue(type, payload, displayTitle, displayDesc) {
        const item = {
            id: 'msg_' + Date.now() + '_' + Math.floor(Math.random()*1000),
            type: type, // 'email' or 'whatsapp'
            payload: payload,
            displayTitle: displayTitle,
            displayDesc: displayDesc,
            sendAt: Date.now() + this.recallWindowMs,
            status: 'pending'
        };
        this.queue.push(item);
        this.render();
        document.getElementById('omnis-outbox-manager').style.display = 'flex';
        document.getElementById('outbox-trigger-btn').style.display = 'none';
        
        if (window.salestrack && window.salestrack.showToast) {
            window.salestrack.showToast(`Queued! Sending in 150 seconds. Open Outbox to recall.`, 'success');
        }
    },

    recall(id) {
        const idx = this.queue.findIndex(i => i.id === id);
        if (idx !== -1) {
            this.queue.splice(idx, 1);
            this.render();
            if (window.salestrack && window.salestrack.showToast) {
                window.salestrack.showToast('Message Recalled Successfully', 'info');
            }
        }
    },

    async tick() {
        const now = Date.now();
        let needsRender = false;
        
        for (let i = this.queue.length - 1; i >= 0; i--) {
            const item = this.queue[i];
            if (item.status === 'pending') {
                if (now >= item.sendAt) {
                    item.status = 'sending';
                    needsRender = true;
                    this.processItem(item).then(() => {
                        this.queue = this.queue.filter(q => q.id !== item.id);
                        this.render();
                    }).catch(err => {
                        console.error('Failed to send outbox item', err);
                        item.status = 'error';
                        item.errorMsg = err.message;
                        this.render();
                    });
                } else {
                    // Just update countdown
                    needsRender = true;
                }
            }
        }
        
        if (needsRender) this.render();
    },

    async processItem(item) {
        if (!window.electron) throw new Error("Electron not available");
        
        if (item.type === 'email') {
            const res = await window.electron.invoke('email:send', item.payload);
            if (res && res.ok) {
                // Update Supabase Flag
                await window.electron.invoke('supabase:query', {
                    table: 'omnis_equipment_orders', method: 'update',
                    params: { data: { notified_email: true }, filters: { id: item.payload.relatedDoc } }
                });
            } else {
                throw new Error(res?.error || 'Email send failed');
            }
        } 
        else if (item.type === 'whatsapp') {
            // Wait WhatsApp payload includes phone numbers, msg, report_id
            const res = await window.electron.invoke('whatsapp:sendMessage', item.payload);
            if (res && res.ok) {
                // Update Supabase Flag
                await window.electron.invoke('supabase:query', {
                    table: 'omnis_equipment_orders', method: 'update',
                    params: { data: { notified_wa: true }, filters: { id: item.payload.report_id } }
                });
            } else {
                throw new Error(res?.error || 'WhatsApp send failed');
            }
        }
    },

    render() {
        const container = document.getElementById('outbox-list');
        const badge1 = document.getElementById('outbox-count-badge');
        const badge2 = document.getElementById('outbox-trigger-badge');
        const trigger = document.getElementById('outbox-trigger-btn');
        const manager = document.getElementById('omnis-outbox-manager');
        
        if (!container) return;

        const pendingCount = this.queue.filter(q => q.status === 'pending').length;
        badge1.innerText = pendingCount;
        badge2.innerText = pendingCount;

        if (this.queue.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:12px;">Queue is empty.</div>';
            if (manager.style.display === 'none') trigger.style.display = 'none';
            return;
        }

        if (manager.style.display === 'none') {
            trigger.style.display = 'flex';
        } else {
            trigger.style.display = 'none';
        }

        const now = Date.now();
        container.innerHTML = this.queue.map(item => {
            if (item.status === 'error') {
                return `
                <div style="background:#fff; border:1px solid var(--accent-red); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-weight:700; font-size:12px; color:var(--text);">${item.displayTitle}</div>
                        <span style="color:var(--accent-red); font-size:11px; font-weight:700;">Failed</span>
                    </div>
                    <div style="font-size:11px; color:#64748b;">${item.displayDesc}</div>
                    <div style="font-size:10px; color:var(--accent-red);">${item.errorMsg}</div>
                    <div style="display:flex; justify-content:flex-end;">
                        <button onclick="window.OutboxManager.recall('${item.id}')" style="background:#e2e8f0; border:none; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer;">Dismiss</button>
                    </div>
                </div>`;
            }
            
            if (item.status === 'sending') {
                return `
                <div style="background:#fff; border:1px solid var(--border); border-radius:8px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:700; font-size:12px; color:var(--text);">${item.displayTitle}</div>
                        <div style="font-size:11px; color:#64748b;">Sending...</div>
                    </div>
                    <i class="fas fa-spinner fa-spin" style="color:var(--accent-blue);"></i>
                </div>`;
            }
            
            const secondsLeft = Math.max(0, Math.ceil((item.sendAt - now) / 1000));
            
            return `
            <div style="background:#fff; border:1px solid var(--border); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:700; font-size:12px; color:var(--text);">${item.displayTitle}</div>
                    <span style="color:var(--accent-orange); font-size:11px; font-weight:700;"><i class="fas fa-stopwatch"></i> ${secondsLeft}s</span>
                </div>
                <div style="font-size:11px; color:#64748b;">${item.displayDesc}</div>
                <div style="display:flex; justify-content:flex-end;">
                    <button onclick="window.OutboxManager.recall('${item.id}')" style="background:var(--accent-red); color:white; border:none; padding:4px 12px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;"><i class="fas fa-undo"></i> Recall</button>
                </div>
            </div>`;
        }).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(window.OutboxManager) window.OutboxManager.init();
    }, 1000);
});

"""

# 1. Update index.html
with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Replace the last </body>
idx = html_content.rfind("</body>")
if idx != -1:
    html_content = html_content[:idx] + outbox_html + "\n</body>" + html_content[idx+7:]
    
with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
    f.write(html_content)


# 2. Append JS
with open(r'c:\Users\Administrator\omnis\systems\salestrack\dashboard_logic.js', 'a', encoding='utf-8') as f:
    f.write(outbox_js)

print("Outbox UI and Logic Injected.")
