
const tutorialSteps = [
    {
        target: '.sidebar-logo',
        title: 'Welcome to Salestrack',
        content: 'This is your dashboard stats center. <br><br><b>Online Sync:</b> The green dot indicates you are connected. The timer shows when data was last synced with the Omnis cloud.',
        position: 'right',
        view: 'view-dashboard'
    },
    {
        target: '[data-view="view-quotations-list"]',
        title: 'Quotations',
        content: 'Manage all your customer quotes here. Track status from Draft to Ordered.',
        position: 'right',
        view: 'view-dashboard' // Stay on dashboard but point to nav
    },
    {
        target: '[data-view="view-ce-list"]',
        title: 'Enquiries',
        content: 'Track incoming customer enquiries and opportunities before they become quotes.',
        position: 'right'
    },

    {
        target: '[data-view="view-products-list"]',
        title: 'Products',
        content: 'Browse your product catalog, check stock levels, and view pricing.',
        position: 'right'
    },
    {
        target: '[data-view="view-customers-list"]',
        title: 'Customers',
        content: 'Your customer database. View contact details and history for each client.',
        position: 'right'
    },

    {
        target: '.primary-pill-btn',
        title: 'Create New',
        content: 'Look for this button in list views to create new records (Quotations, Enquiries, etc).',
        position: 'bottom',
        view: 'view-quotations-list' // Switch to a list view to show the button
        // Note: We might need to handle if the button isn't visible in some views, but q-list has it.
    }
];

class TutorialManager {
    constructor(steps) {
        this.steps = steps;
        this.currentStep = 0;
        this.isActive = false;
    }

    start() {
        if (localStorage.getItem('omnis_tutorial_completed') === 'true') {
            console.log("Tutorial skipped (user preference).");
            return;
        }

        // Wait a moment for UI to settle
        setTimeout(() => {
            this.isActive = true;
            this.createOverlay();
            this.showStep(0);
        }, 1000);
    }

    createOverlay() {
        // Dimmed background
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        document.body.appendChild(this.overlay);

        // Bubble container
        this.bubble = document.createElement('div');
        this.bubble.className = 'tutorial-bubble';
        document.body.appendChild(this.bubble);

        // Highlight box (cutout effect or separate div)
        this.highlight = document.createElement('div');
        this.highlight.className = 'tutorial-highlight-box';
        document.body.appendChild(this.highlight);
    }

    showStep(index) {
        if (index >= this.steps.length) {
            this.finish();
            return;
        }
        this.currentStep = index;
        const step = this.steps[index];

        // Switch view if needed
        if (step.view && window.switchToView) {
            window.switchToView(step.view);
            // Give UI a moment to render
            setTimeout(() => this.processStep(step), 300);
        } else {
            this.processStep(step);
        }
    }

    processStep(step) {
        const target = document.querySelector(step.target);
        if (!target) {
            console.warn(`Tutorial target not found: ${step.target}. Skipping.`);
            // Try next step after short delay
            setTimeout(() => this.showStep(this.currentStep + 1), 100);
            return;
        }

        // 1. Highlight Target
        const rect = target.getBoundingClientRect();
        this.positionHighlight(rect);

        // 2. Position Bubble
        this.renderBubbleContent(step);

        // Wait for bubble to render to get true size
        requestAnimationFrame(() => {
            this.positionBubble(rect, step.position);
        });

        // 3. Scroll if needed
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    positionHighlight(rect) {
        // Adjust for fixed/scroll
        this.highlight.style.top = `${rect.top - 5}px`;
        this.highlight.style.left = `${rect.left - 5}px`;
        this.highlight.style.width = `${rect.width + 10}px`;
        this.highlight.style.height = `${rect.height + 10}px`;
    }

    renderBubbleContent(step) {
        const isLast = this.currentStep === this.steps.length - 1;
        const counter = `<span class="t-counter">${this.currentStep + 1}/${this.steps.length}</span>`;

        this.bubble.innerHTML = `
            <div class="t-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <h3 style="margin:0;">${step.title}</h3>
                ${counter}
            </div>
            <div class="t-content">
                <p>${step.content}</p>
            </div>
            <div class="t-footer">
                <label class="t-check-label">
                    <input type="checkbox" id="t-never-show"> Don't show again
                </label>
                <div class="t-actions">
                    <button class="t-btn t-skip" onclick="window.tutorialMgr.skip()">Skip</button>
                    <button class="t-btn t-next" onclick="window.tutorialMgr.next()">${isLast ? 'Finish' : 'Next'}</button>
                </div>
            </div>
            <div class="t-arrow ${step.position}"></div>
        `;
    }

    positionBubble(targetRect, position) {
        // Reset positioning class
        this.bubble.className = `tutorial-bubble pos-${position}`;

        const bubbleRect = this.bubble.getBoundingClientRect();
        let top, left;
        const gap = 15;

        // Calculate absolute position based on viewport (fixed)
        switch (position) {
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (bubbleRect.height / 2);
                left = targetRect.right + gap;
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (bubbleRect.height / 2);
                left = targetRect.left - bubbleRect.width - gap;
                break;
            case 'bottom':
                top = targetRect.bottom + gap;
                left = targetRect.left + (targetRect.width / 2) - (bubbleRect.width / 2);
                break;
            case 'top':
                top = targetRect.top - bubbleRect.height - gap;
                left = targetRect.left + (targetRect.width / 2) - (bubbleRect.width / 2);
                break;
            default:
                top = targetRect.bottom + gap;
                left = targetRect.left;
        }

        // Screen Edge Guards
        const padding = 10;
        const maxLeft = window.innerWidth - bubbleRect.width - padding;
        const maxTop = window.innerHeight - bubbleRect.height - padding;

        if (left < padding) left = padding;
        if (left > maxLeft) left = maxLeft;
        if (top < padding) top = padding;
        if (top > maxTop) top = maxTop;

        this.bubble.style.top = `${top}px`;
        this.bubble.style.left = `${left}px`;
    }

    next() {
        this.checkPersistence();
        this.showStep(this.currentStep + 1);
    }

    skip() {
        this.checkPersistence();
        this.finish();
    }

    checkPersistence() {
        const checkbox = document.getElementById('t-never-show');
        if (checkbox && checkbox.checked) {
            localStorage.setItem('omnis_tutorial_completed', 'true');
        }
    }

    finish() {
        this.isActive = false;
        if (this.overlay) this.overlay.remove();
        if (this.bubble) this.bubble.remove();
        if (this.highlight) this.highlight.remove();
    }
}

// Global Instance
window.tutorialMgr = new TutorialManager(tutorialSteps);

// Auto-start on load
document.addEventListener('DOMContentLoaded', () => {
    // window.tutorialMgr.start(); // Disabled by default to fix layout issues
});
