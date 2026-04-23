/**
 * Cybernetic FX Controller for Salestrack
 * Implements Mouse-Aware Parallax and HUD Particle Streams
 */

(function() {
    console.log("Cybernetic FX: Initializing...");

    const sidebar = document.querySelector('.sidebar');
    const particleContainer = document.getElementById('sidebar-particles');
    if (!sidebar || !particleContainer) {
        console.warn("Cybernetic FX: Sidebar components not found.");
        return;
    }

    // --- 1. MOUSE-AWARE PARALLAX ---
    sidebar.addEventListener('mousemove', (e) => {
        const rect = sidebar.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Normalized offsets (-1 to 1)
        const moveX = (e.clientX - centerX) / (rect.width / 2);
        const moveY = (e.clientY - centerY) / (rect.height / 2);

        // Update all parallax blobs
        const blobs = sidebar.querySelectorAll('.blob');
        blobs.forEach(blob => {
            const factor = parseFloat(getComputedStyle(blob).getPropertyValue('--p-factor')) || 0.05;
            const px = moveX * (rect.width * factor);
            const py = moveY * (rect.height * factor);
            
            blob.style.setProperty('--p-x', `${px}px`);
            blob.style.setProperty('--p-y', `${py}px`);
        });
    });

    // Reset parallax on mouse leave
    sidebar.addEventListener('mouseleave', () => {
        const blobs = sidebar.querySelectorAll('.blob');
        blobs.forEach(blob => {
            blob.style.setProperty('--p-x', '0px');
            blob.style.setProperty('--p-y', '0px');
        });
    });

    // --- 2. HUD PARTICLE SYSTEM ---
    const MAX_PARTICLES = 15;
    const particles = [];

    function createParticle() {
        if (particles.length >= MAX_PARTICLES) return;

        const p = document.createElement('div');
        p.className = 'particle';
        
        // Random starting position
        const startX = Math.random() * 100;
        const startY = 100 + (Math.random() * 20); // Start below the visible area
        
        p.style.left = `${startX}%`;
        p.style.top = `${startY}%`;
        
        // Random speed and delay
        const duration = 5000 + Math.random() * 5000;
        const delay = Math.random() * 2000;
        const size = 1 + Math.random() * 2;
        
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        
        particleContainer.appendChild(p);
        particles.push(p);

        // Animation via Web Animations API for better performance
        const animation = p.animate([
            { transform: 'translateY(0)', opacity: 0 },
            { transform: 'translateY(-20vh)', opacity: 0.3, offset: 0.2 },
            { transform: 'translateY(-80vh)', opacity: 0.3, offset: 0.8 },
            { transform: 'translateY(-110vh)', opacity: 0 }
        ], {
            duration: duration,
            delay: delay,
            iterations: Infinity
        });

        // Store reference to cleanup if needed
        p._anim = animation;
    }

    // Spawn particles over time
    for (let i = 0; i < MAX_PARTICLES; i++) {
        setTimeout(createParticle, i * 300);
    }

    console.log("Cybernetic FX: System operational.");
})();
