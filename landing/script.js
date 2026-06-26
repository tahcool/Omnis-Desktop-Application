/* OMNIS Landing — Interactions + Map Telemetry Canvas */

// ── Floating nav ──────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60), { passive: true });

// ── Smooth anchors ────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return; e.preventDefault();
    window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  });
});

// ── Scroll reveal ─────────────────────────────────
const revEls = document.querySelectorAll('.feat-card,.module-row,.section-h,.section-p,.label-tag,.cta-h,.cta-p,.cta-logo');
revEls.forEach(el => el.classList.add('reveal'));
const revObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const siblings = [...entry.target.parentElement.children];
    setTimeout(() => entry.target.classList.add('in'), siblings.indexOf(entry.target) * 70);
    revObs.unobserve(entry.target);
  });
}, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
revEls.forEach(el => revObs.observe(el));

// ══════════════════════════════════════════════════
//  MAP TELEMETRY ANIMATION
//
//  Concept: Top-down view of machinery on a site.
//  - Machine icons (coloured squares/rectangles) sit
//    at fixed positions like GPS pins on a map.
//  - Each machine periodically "transmits" a signal —
//    a sonar-style radial pulse expands from it.
//  - Data packets (bright dots with tails) travel
//    along curved bezier paths from machines to a
//    central "hub" representing the OMNIS system.
//  - Thin grid lines simulate a map grid overlay.
//  - Coordinate readouts flash near each machine.
// ══════════════════════════════════════════════════
(function mapTelemetry() {
  const C = document.getElementById('net-canvas');
  if (!C) return;
  const X = C.getContext('2d');
  let W, H;

  // Palette
  const RED  = 'rgba(176,32,32,';
  const GOLD = 'rgba(201,150,58,';
  const TEAL = 'rgba(40,180,160,';
  const WHT  = 'rgba(240,235,255,';
  const GRN  = 'rgba(80,200,100,';

  // Machine types: colour, label, size
  const TYPES = [
    { col: RED,  label: 'EXC', w: 10, h: 7  },  // Excavator
    { col: GOLD, label: 'DT',  w: 14, h: 8  },  // Dump Truck
    { col: TEAL, label: 'BLD', w: 12, h: 7  },  // Bulldozer
    { col: GRN,  label: 'CRN', w: 7,  h: 14 },  // Crane
  ];

  let machines = [], packets = [], hub = { x: 0, y: 0 };
  const MACHINE_COUNT = 14;

  function resize() {
    W = C.width  = C.offsetWidth;
    H = C.height = C.offsetHeight;
    hub = { x: W * 0.5, y: H * 0.46 };
    buildMachines();
  }

  function buildMachines() {
    machines = [];
    // Scatter machines around the frame, avoiding dead centre
    for (let i = 0; i < MACHINE_COUNT; i++) {
      let x, y, tries = 0;
      do {
        x = W * 0.08 + Math.random() * W * 0.84;
        y = H * 0.08 + Math.random() * H * 0.84;
        tries++;
      } while (Math.hypot(x - hub.x, y - hub.y) < W * 0.18 && tries < 20);

      const type = TYPES[Math.floor(Math.random() * TYPES.length)];
      const heading = Math.random() * Math.PI * 2;
      machines.push({
        x, y,
        type,
        heading,
        // Pulse state
        pulseT: Math.random() * 100,    // offset so they don't all fire at once
        pulseR: 0,
        pulseFiring: false,
        // Coord display
        lat:  (-17 + Math.random() * 0.05).toFixed(5),
        lon:  ( 31 + Math.random() * 0.05).toFixed(5),
        coordAlpha: 0,
        coordFade: 0,
        // ID
        id: `M${String(i + 1).padStart(2,'0')}`
      });
    }
    packets = [];
  }

  // Spawn a bezier data packet from machine → hub
  function spawnPacket(m) {
    const cpx = m.x + (hub.x - m.x) * 0.5 + (Math.random() - 0.5) * W * 0.2;
    const cpy = m.y + (hub.y - m.y) * 0.5 + (Math.random() - 0.5) * H * 0.2;
    packets.push({
      sx: m.x, sy: m.y,
      cpx, cpy,
      ex: hub.x, ey: hub.y,
      t: 0,
      spd: 0.004 + Math.random() * 0.006,
      col: m.type.col,
      sz: 2.5 + Math.random(),
      // Store past positions for trail
      trail: []
    });
  }

  // Quadratic bezier point
  function bez(sx, sy, cpx, cpy, ex, ey, t) {
    const mt = 1 - t;
    return {
      x: mt*mt*sx + 2*mt*t*cpx + t*t*ex,
      y: mt*mt*sy + 2*mt*t*cpy + t*t*ey
    };
  }

  let tick = 0;

  function frame() {
    tick++;
    X.clearRect(0, 0, W, H);

    // ── 1. Map grid overlay ──────────────────────
    X.save();
    X.strokeStyle = 'rgba(180,160,255,0.04)';
    X.lineWidth = 1;
    const GRID = 60;
    for (let gx = 0; gx < W; gx += GRID) {
      X.beginPath(); X.moveTo(gx, 0); X.lineTo(gx, H); X.stroke();
    }
    for (let gy = 0; gy < H; gy += GRID) {
      X.beginPath(); X.moveTo(0, gy); X.lineTo(W, gy); X.stroke();
    }
    X.restore();

    // ── 2. Hub (OMNIS receiver) ──────────────────
    // Outer ring
    const hubPulse = 0.5 + 0.5 * Math.sin(tick * 0.04);
    X.beginPath();
    X.arc(hub.x, hub.y, 22 + hubPulse * 5, 0, Math.PI * 2);
    X.strokeStyle = `rgba(139,26,26,${0.18 + hubPulse * 0.12})`;
    X.lineWidth = 1.5; X.stroke();

    X.beginPath();
    X.arc(hub.x, hub.y, 14, 0, Math.PI * 2);
    X.strokeStyle = 'rgba(139,26,26,0.55)';
    X.lineWidth = 1.5; X.stroke();

    // Core dot
    X.beginPath();
    X.arc(hub.x, hub.y, 5, 0, Math.PI * 2);
    X.fillStyle = 'rgba(200,50,50,0.9)'; X.fill();

    // Glow
    const hg = X.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, 40);
    hg.addColorStop(0, 'rgba(139,26,26,0.25)');
    hg.addColorStop(1, 'rgba(139,26,26,0)');
    X.beginPath(); X.arc(hub.x, hub.y, 40, 0, Math.PI * 2);
    X.fillStyle = hg; X.fill();

    // OMNIS label
    X.fillStyle = 'rgba(200,50,50,0.75)';
    X.font = '500 9px "Space Grotesk", monospace';
    X.textAlign = 'center';
    X.fillText('OMNIS HUB', hub.x, hub.y + 26);

    // ── 3. Machines ──────────────────────────────
    machines.forEach((m, mi) => {
      m.pulseT++;

      // Trigger pulse every ~180 ticks (staggered)
      if (!m.pulseFiring && (m.pulseT + mi * 14) % 180 === 0) {
        m.pulseFiring = true;
        m.pulseR = 0;
        m.coordAlpha = 1;
        m.coordFade = 0;
        spawnPacket(m);
      }

      // Animate pulse ring
      if (m.pulseFiring) {
        m.pulseR += 1.8;
        const pa = Math.max(0, 0.6 - m.pulseR / 60);
        X.beginPath();
        X.arc(m.x, m.y, m.pulseR, 0, Math.PI * 2);
        X.strokeStyle = `${m.type.col}${pa})`;
        X.lineWidth = 1.2; X.stroke();
        if (m.pulseR > 55) { m.pulseFiring = false; m.pulseR = 0; }
      }

      // Coord readout fade
      if (m.coordAlpha > 0) {
        m.coordFade++;
        m.coordAlpha = Math.max(0, 1 - m.coordFade / 90);
      }

      // Machine body (rotated rectangle)
      X.save();
      X.translate(m.x, m.y);
      X.rotate(m.heading);
      const { w, h, col } = m.type;

      // Shadow
      X.shadowColor = `${col}0.5)`;
      X.shadowBlur = 8;

      // Body
      X.fillStyle = `${col}0.85)`;
      X.fillRect(-w/2, -h/2, w, h);

      // Highlight stripe
      X.fillStyle = `${WHT}0.15)`;
      X.fillRect(-w/2, -h/2, w, h * 0.3);

      X.shadowBlur = 0;
      X.restore();

      // Machine ID tag
      X.fillStyle = `${m.type.col}0.85)`;
      X.font = '700 8px monospace';
      X.textAlign = 'left';
      X.fillText(m.id, m.x + 9, m.y - 5);

      // Type label
      X.fillStyle = `${WHT}0.45)`;
      X.font = '500 7px monospace';
      X.fillText(m.type.label, m.x + 9, m.y + 4);

      // Coord readout
      if (m.coordAlpha > 0.01) {
        X.fillStyle = `${GOLD}${m.coordAlpha * 0.85})`;
        X.font = '500 7.5px "Space Grotesk", monospace';
        X.fillText(`${m.lat}°S`, m.x + 9, m.y + 14);
        X.fillText(`${m.lon}°E`, m.x + 9, m.y + 22);
      }

      // Active indicator dot
      const blink = Math.sin(tick * 0.06 + mi) > 0;
      X.beginPath();
      X.arc(m.x - m.type.w/2 - 3, m.y - m.type.h/2 - 3, 2, 0, Math.PI * 2);
      X.fillStyle = blink ? `${m.type.col}0.9)` : `${m.type.col}0.2)`;
      X.fill();
    });

    // ── 4. Data packets ─────────────────────────
    packets = packets.filter(p => {
      p.t += p.spd;
      const pos = bez(p.sx, p.sy, p.cpx, p.cpy, p.ex, p.ey, p.t);

      // Store trail
      p.trail.push({ x: pos.x, y: pos.y });
      if (p.trail.length > 18) p.trail.shift();

      // Draw trail
      for (let i = 1; i < p.trail.length; i++) {
        const a = (i / p.trail.length) * 0.55;
        X.beginPath();
        X.moveTo(p.trail[i-1].x, p.trail[i-1].y);
        X.lineTo(p.trail[i].x, p.trail[i].y);
        X.strokeStyle = `${p.col}${a})`;
        X.lineWidth = p.sz * 0.7; X.stroke();
      }

      // Packet head
      X.beginPath();
      X.arc(pos.x, pos.y, p.sz, 0, Math.PI * 2);
      X.fillStyle = `${p.col}0.95)`; X.fill();

      // Head glow
      const hg2 = X.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, p.sz * 4);
      hg2.addColorStop(0, `${p.col}0.3)`);
      hg2.addColorStop(1, `${p.col}0)`);
      X.beginPath(); X.arc(pos.x, pos.y, p.sz * 4, 0, Math.PI * 2);
      X.fillStyle = hg2; X.fill();

      // Draw bezier path (faint)
      if (p.trail.length < 3) {
        X.beginPath();
        X.moveTo(p.sx, p.sy);
        X.quadraticCurveTo(p.cpx, p.cpy, p.ex, p.ey);
        X.strokeStyle = `${p.col}0.06)`;
        X.lineWidth = 1; X.setLineDash([4, 8]); X.stroke();
        X.setLineDash([]);
      }

      // Arrival burst at hub
      if (p.t >= 0.9) {
        const ba = (1 - p.t) / 0.1;
        X.beginPath();
        X.arc(hub.x, hub.y, 8 + (1 - ba) * 14, 0, Math.PI * 2);
        X.strokeStyle = `${p.col}${ba * 0.5})`;
        X.lineWidth = 1.5; X.stroke();
      }

      return p.t < 1.0;
    });

    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  frame();
})();
