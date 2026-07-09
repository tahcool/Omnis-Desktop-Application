/**
 * OMNIS TRAINING LIBRARY v6
 * MC 110 Z EVO Retooling Course - with real Kleemann media
 */
console.log('[TrainingLibrary] script loaded v6');

// ── COURSE DATA ───────────────────────────────────────────────────────────────
var _BASE = 'https://www.wirtgen-group.com/webspecial/kleemann/training/retooling/mc110z/data/';
var TRAINING_COURSES = [
  {
    id: 'kleemann-mc110z-retooling',
    title: 'MC 110 Z EVO Retooling',
    subtitle: 'Distance Plates and Toggle Plate Replacement',
    brand: 'Wirtgen / Kleemann',
    level: 'Intermediate',
    duration: '45 min',
    tags: ['Jaw Crusher', 'Retooling', 'Maintenance', 'Safety'],
    color1: '#1a1a2e', color2: '#16213e',
    thumb: _BASE + 'img/Thumb_menu.jpg',
    description: 'Learn how to correctly perform retooling tasks on the Kleemann MC 110 Z EVO jaw crusher. Covers changing distance plates and the toggle plate, following all safety protocols.',
    sections: [
      {
        id: 'sec-intro', title: 'Introduction and Safety', icon: 'Intro',
        steps: [
          {
            id: 's0-intro', type: 'title',
            title: 'MC 110 Z EVO Retooling Training',
            video: _BASE + 'video/en.Vid_CH01_SL01-SD.mp4',
            poster: _BASE + 'img/en.Standbild_CH01_SL01.jpg',
            body: 'Welcome to the Kleemann MC 110 Z EVO retooling training course. This interactive course covers step-by-step procedures for replacing distance plates and the toggle plate on the jaw crusher.',
            note: 'This course has 2 operational sections (8 steps) plus a knowledge check quiz.'
          },
          {
            id: 's0-safety', type: 'warning',
            title: 'Safety Warning - PPE Required',
            body: 'Ensure you always wear the following personal protective equipment under construction site conditions:',
            bullets: ['Warning clothing (high-visibility vest)', 'Safety shoes (steel-toe boots)', 'Protective helmet (hard hat)', 'Safety glasses or goggles', 'Ear protection - noise level can exceed 80 dB(A)', 'Gloves appropriate to the task'],
            note: 'Never begin retooling without first shutting down and securing the machine with lock-out / tag-out.'
          }
        ]
      },
      {
        id: 'sec-dist', title: 'Section I: Distance Plates', icon: 'Dist',
        steps: [
          {
            id: 's1-step1', type: 'step', step_number: 'I - 1 / 3',
            title: 'Relieving the Distance Plate',
            video: _BASE + 'video/en.Vid_CH02_SL01-SD.mp4',
            poster: _BASE + 'img/en.Standbild_CH02_SL01.jpg',
            body: 'Before removing the distance plates, you must first relieve (de-tension) them to prevent injury from stored energy in the spring assembly.',
            procedure: ['Park the crusher on stable, level ground and engage the parking brake.', 'Shut down the engine and allow all moving parts to come to a complete stop.', 'Apply lock-out / tag-out to the machine in accordance with your site safety procedure.', 'Locate the toggle plate tension spring assembly at the rear of the crusher jaw.', 'Using the correct spanner, carefully loosen the tension bolts to relieve pressure on the distance plate.', 'Confirm zero pressure - the distance plate should now move freely by hand.'],
            tools: ['Combination spanner set', 'Torque wrench', 'Lock-out tag-out kit'],
            note: 'Always confirm the machine is fully de-energised before placing hands near the toggle area.'
          },
          {
            id: 's1-step2', type: 'step', step_number: 'I - 2 / 3',
            title: 'Installing or Removing Distance Plates',
            video: _BASE + 'video/Vid_CH02_SL02-SD.mp4',
            poster: _BASE + 'img/Standbild_CH02_SL02.jpg',
            body: 'Distance plates adjust the closed-side setting (CSS). Removing plates increases the gap; adding plates decreases it.',
            procedure: ['With the distance plate fully relieved, slide out the existing plate(s) from the rear toggle seat.', 'Inspect the removed plates for wear, cracking or deformation - replace any damaged plates.', 'Select the correct number and thickness of distance plates to achieve the required CSS setting.', 'Slide the new plates back into the toggle seat, ensuring they seat flush and square.', 'Verify plate alignment before proceeding to the clamping step.', 'Record the CSS setting change in the machine maintenance log.'],
            tools: ['Distance plates (various thicknesses)', 'Measuring tape / feeler gauge', 'Grease gun', 'Maintenance log'],
            caution: 'Never operate the machine with misaligned or missing distance plates - this will cause severe toggle plate damage and possible crusher failure.'
          },
          {
            id: 's1-step3', type: 'step', step_number: 'I - 3 / 3',
            title: 'Clamping the Distance Plates',
            video: _BASE + 'video/en.Vid_CH03_SL01-SD.mp4',
            poster: _BASE + 'img/en.Standbild_CH03_SL01.jpg',
            body: 'Once the correct distance plates are in position, they must be clamped to the correct torque specification.',
            procedure: ['Ensure the distance plates are fully seated in the toggle plate seat before tensioning.', 'Apply grease to the tension rod threads and contact faces.', 'Hand-tighten the tension bolt until the spring is just beginning to compress.', 'Using a calibrated torque wrench, tighten to the specified torque value per the maintenance manual.', 'Check that the spring compressed length matches the specification.', 'Remove all lock-out / tag-out equipment only after torquing is confirmed correct.', 'Run the crusher briefly at idle and listen for abnormal noise from the toggle area.'],
            tools: ['Calibrated torque wrench', 'Grease gun', 'Vernier caliper', 'MC 110 Z EVO Maintenance Manual'],
            note: 'Correct tensioning is critical. Under-tensioning can allow plates to jump out; over-tensioning may damage the tension rod.'
          }
        ]
      },
      {
        id: 'sec-toggle', title: 'Section II: Toggle Plate', icon: 'Tgl',
        steps: [
          {
            id: 's2-step1', type: 'step', step_number: 'II - 1 / 5',
            title: 'Relieving the Toggle Plate',
            video: _BASE + 'video/en.Vid_CH04_SL01-SD.mp4',
            poster: _BASE + 'img/en.Standbild_CH04_SL01.jpg',
            body: 'The toggle plate protects the crusher from uncrushable objects. Changing it requires fully relieving all stored spring tension.',
            procedure: ['Complete the full machine shutdown and lock-out / tag-out procedure.', 'Remove the crusher feed material and allow the jaw to cycle clear before shutdown.', 'Locate the main tension spring assembly at the rear of the swing jaw.', 'Progressively loosen the tension rod nuts, alternating sides to release tension evenly.', 'Continue loosening until the spring is fully de-compressed and there is zero resistance.', 'Confirm that the swing jaw hangs freely.'],
            tools: ['Heavy-duty spanner or breaker bar', 'Lock-out tag-out kit'],
            caution: 'Stored spring energy is very significant. Stand clear of the toggle area during de-tensioning. NEVER cut or grind the tension rod while under load.'
          },
          {
            id: 's2-step2', type: 'step', step_number: 'II - 2 / 5',
            title: 'Securing the Toggle Plate and Bearings',
            video: _BASE + 'video/Vid_CH05_SL01-SD.mp4',
            poster: _BASE + 'img/Standbild_CH05_SL01.jpg',
            body: 'Before the toggle plate can be removed, the swing jaw and toggle seat must be secured to prevent uncontrolled movement.',
            procedure: ['Position a suitable safety prop or stand under the swing jaw to support its weight.', 'Inspect the toggle plate bearing blocks on both sides.', 'If the bearing blocks show wear, plan to replace them at the same time as the toggle plate.', 'Attach a suitable lifting strap or chain sling around the toggle plate.', 'Have a second person present to assist with guiding the toggle plate during removal.'],
            tools: ['Safety prop or swing jaw stand', 'Lifting strap or chain sling (rated capacity)', 'Assistant / banksman'],
            note: 'The MC 110 Z EVO toggle plate typically weighs 30-80 kg - mechanical lifting is required.'
          },
          {
            id: 's2-step3', type: 'step', step_number: 'II - 3 / 5',
            title: 'Removing the Toggle Plate',
            video: _BASE + 'video/Vid_CH05_SL02-SD.mp4',
            poster: _BASE + 'img/Standbild_CH05_SL02.jpg',
            body: 'With the swing jaw propped and the toggle plate secured by a lifting device, the plate can now be carefully slid out of its seats.',
            procedure: ['Confirm the lifting strap or sling is correctly attached and adequately tensioned.', 'Slide the toggle plate sideways out of the rear (fixed jaw) toggle seat.', 'Once the rear end is free, lower and slide the front of the toggle plate out of the swing jaw seat.', 'Lower the toggle plate to the ground using controlled lifting - never drop it.', 'Inspect both toggle seats for wear, cracks or damage.', 'Clean the seats thoroughly before fitting the new plate.'],
            tools: ['Lifting strap or chain block', 'Wire brush or scraper', 'Cleaning rag and solvent'],
            caution: 'Ensure the swing jaw is propped securely AT ALL TIMES during toggle plate removal. A falling swing jaw can cause fatal injury.'
          },
          {
            id: 's2-step4', type: 'step', step_number: 'II - 4 / 5',
            title: 'Installing the New Toggle Plate',
            video: _BASE + 'video/Vid_CH05_SL03-SD.mp4',
            poster: _BASE + 'img/Standbild_CH05_SL03.jpg',
            body: 'The new toggle plate must be installed in the reverse sequence of removal.',
            procedure: ['Inspect the new toggle plate - verify it is the correct OEM part number for the MC 110 Z EVO.', 'Apply a thin coat of high-temperature grease to both ends of the toggle plate and to both toggle seats.', 'Using the lifting strap, raise the new toggle plate into position above the swing jaw seat.', 'Slide the front end of the toggle plate into the swing jaw seat first, guiding it in squarely.', 'Then slide the rear end into the fixed jaw toggle seat - the plate should seat firmly.', 'Remove the lifting strap and confirm the toggle plate is fully seated.', 'Remove the swing jaw safety prop only after the toggle plate is confirmed fully seated.'],
            tools: ['High-temperature grease', 'Lifting strap or chain block', 'Inspection torch'],
            note: 'Always use the correct OEM part. Substandard toggle plates can fail prematurely and cause serious crusher damage.'
          },
          {
            id: 's2-step5', type: 'step', step_number: 'II - 5 / 5',
            title: 'Clamping the Toggle Plate',
            video: _BASE + 'video/en.Vid_CH08_SL01-SD.mp4',
            poster: _BASE + 'img/en.Standbild_CH08_SL01.jpg',
            body: 'The final step is to re-tension the spring assembly to lock the toggle plate in place.',
            procedure: ['Thread the tension rod back through the spring, distance plates and toggle seat.', 'Hand-tighten the tension nut until the spring begins to compress.', 'Using a calibrated torque wrench, torque progressively to the manufacturer specification.', 'Measure the compressed spring length and confirm it is within the specified range.', 'Re-fit any guards or covers that were removed during the procedure.', 'Remove all lock-out / tag-out devices only after all checks are complete.', 'Start the crusher at idle speed and observe for 5 minutes.', 'Verify and record the CSS setting before resuming production.'],
            tools: ['Calibrated torque wrench', 'Vernier caliper', 'Grease gun', 'Maintenance log'],
            caution: 'A supervised idle run inspection is mandatory after any toggle plate change. Do not resume full crushing loads without completing this check.'
          }
        ]
      },
      {
        id: 'sec-quiz', title: 'Knowledge Check', icon: 'Quiz',
        steps: [
          {
            id: 'quiz-1', type: 'quiz', title: 'Knowledge Check',
            questions: [
              { q: 'What is the FIRST action to take before removing distance plates?', options: ['Remove the distance plates while the engine is idling', 'Shut down the machine and apply lock-out / tag-out', 'Start the engine to cycle the jaw clear before switching off', 'Call the site supervisor for approval'], correct: 1, explanation: 'Lock-out / tag-out is always the first mandatory step before any maintenance to prevent accidental start-up.' },
              { q: 'What happens to the CSS when you REMOVE distance plates?', options: ['The CSS gap increases (jaws open wider)', 'The CSS gap decreases (jaws close tighter)', 'Nothing - distance plates do not affect CSS', 'The toggle plate is released automatically'], correct: 0, explanation: 'Removing distance plates increases the gap between the jaws. Adding plates decreases the gap.' },
              { q: 'When installing a new toggle plate, which end is inserted FIRST?', options: ['The rear end (fixed jaw side)', 'Either end - it does not matter', 'The front end (swing jaw side)', 'Both ends must be inserted simultaneously'], correct: 2, explanation: 'The front end (swing jaw seat) is fitted first, then the rear end is carefully guided into the fixed jaw toggle seat.' },
              { q: 'Why must the swing jaw be PROPPED during toggle plate removal?', options: ['To keep the CSS setting stable', 'It is optional - the jaw is light enough to hold', 'To prevent the swing jaw from falling and causing fatal injury', 'To allow the tension rod to be removed more easily'], correct: 2, explanation: 'A falling swing jaw can cause fatal injury. It must always be propped securely before removing the toggle plate.' },
              { q: 'After completing a toggle plate change, what MUST be done before resuming production?', options: ['Nothing - the crusher is ready immediately', 'Run at idle speed for at least 5 minutes and inspect for abnormal noise', 'Call Kleemann technical support to verify the installation', 'Apply 5 litres of grease to the toggle area'], correct: 1, explanation: 'A supervised idle run inspection (minimum 5 minutes) is mandatory after any toggle plate change.' }
            ]
          }
        ]
      }
    ]
  }
];

// ── STATE ─────────────────────────────────────────────────────────────────────
var _tlState = {
  view: 'library', course: null, sectionIdx: 0, stepIdx: 0,
  completed: {}, quizAnswers: {}, quizSubmitted: false
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _renderVideoNode(url, poster) {
  if (!url) return '';
  if (url.indexOf('youtube.com/watch?v=') > -1) {
    var id = url.split('v=')[1].split('&')[0];
    return '<iframe width="100%" height="400" src="https://www.youtube.com/embed/'+id+'" frameborder="0" allowfullscreen style="border:none;display:block;"></iframe>';
  } else if (url.indexOf('youtu.be/') > -1) {
    var id = url.split('youtu.be/')[1].split('?')[0];
    return '<iframe width="100%" height="400" src="https://www.youtube.com/embed/'+id+'" frameborder="0" allowfullscreen style="border:none;display:block;"></iframe>';
  } else if (url.indexOf('vimeo.com/') > -1) {
    var id = url.split('vimeo.com/')[1].split('/')[0];
    return '<iframe src="https://player.vimeo.com/video/'+id+'" width="100%" height="400" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="border:none;display:block;"></iframe>';
  } else {
    return '<video controls preload="metadata" style="width:100%;height:auto;max-height:400px;display:block;"' + (poster ? ' poster="' + poster + '"' : '') + '><source src="' + url + '" type="video/mp4"></video>';
  }
}

// ── MAIN ENTRY ────────────────────────────────────────────────────────────────
window.renderTrainingLibrary = function() {
  console.log('[TrainingLibrary] render called, view:', _tlState.view);
  var c = document.getElementById('training-library-root');
  if (!c) { console.error('[TrainingLibrary] training-library-root NOT FOUND in DOM'); return; }
  try {
    if (_tlState.view === 'library') {
      _renderLibraryHome(c);
    } else if (_tlState.view === 'stats') {
      _renderStatsDashboard(c);
    } else {
      _renderCoursePlayer(c);
    }
  } catch(err) {
    console.error('[TrainingLibrary] render error:', err.message || err);
    c.innerHTML = '<div style="padding:40px;color:#dc2626;font-family:monospace;font-size:13px;">Render error: ' + esc(String(err.message || err)) + '</div>';
  }
};

// ── LIBRARY HOME ──────────────────────────────────────────────────────────────
function _renderLibraryHome(container) {
  var html = '<div style="padding:28px 32px;max-width:1400px;margin:0 auto;">';

  // Header
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">';
  html += '<div>';
  html += '<h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 4px;">';
  html += '<i class="fas fa-graduation-cap" style="color:#7c3aed;margin-right:10px;"></i>Training Library</h1>';
  html += '<p style="font-size:13px;color:#64748b;margin:0;">' + TRAINING_COURSES.length + ' course(s) available</p>';
  html += '</div>';
  html += '<div style="display:flex;gap:12px;">';
  html += '<button onclick="window.tlViewStats()" style="background:white;color:#0f172a;border:1px solid #e2e8f0;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);"><i class="fas fa-chart-pie" style="color:#7c3aed;margin-right:8px;"></i>Admin Stats</button>';
  html += '<button onclick="window.tlAddCourse()" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,0.2);">';
  html += '<i class="fas fa-plus" style="margin-right:8px;"></i>Add Course</button>';
  html += '</div>';
  html += '</div>';

  // Cards grid
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px;">';
  for (var ci = 0; ci < TRAINING_COURSES.length; ci++) {
    var course = TRAINING_COURSES[ci];
    var totalSteps = 0;
    for (var si2 = 0; si2 < course.sections.length; si2++) totalSteps += course.sections[si2].steps.length;
    var doneSteps = 0;
    for (var si3 = 0; si3 < course.sections.length; si3++) {
      for (var sti2 = 0; sti2 < course.sections[si3].steps.length; sti2++) {
        if (_tlState.completed[course.sections[si3].steps[sti2].id]) doneSteps++;
      }
    }
    var pct = totalSteps > 0 ? Math.round(doneSteps / totalSteps * 100) : 0;
    var btnLabel = pct === 0 ? 'Start Course' : (pct === 100 ? 'Review Course' : 'Continue Course');
    var lvlColors = { Intermediate: '#f59e0b', Beginner: '#10b981', Advanced: '#ef4444' };
    var lvlCol = lvlColors[course.level] || '#64748b';
    var tagHtml = '';
    for (var ti = 0; ti < course.tags.length; ti++) {
      tagHtml += '<span style="background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;">' + esc(course.tags[ti]) + '</span> ';
    }

    html += '<div style="background:white;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);">';

    // Card header gradient
    html += '<div style="background:linear-gradient(135deg,' + course.color1 + ',' + course.color2 + ');padding:20px;position:relative;">';
    html += '<button onclick="event.stopPropagation(); window.tlDeleteCourse(\''+course.id+'\')" title="Delete Course" style="position:absolute;top:16px;right:16px;background:rgba(0,0,0,0.2);border:none;border-radius:6px;color:rgba(255,255,255,0.7);width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background=\'#dc2626\';this.style.color=\'white\'" onmouseout="this.style.background=\'rgba(0,0,0,0.2)\';this.style.color=\'rgba(255,255,255,0.7)\'"><i class="fas fa-trash-alt" style="font-size:12px;"></i></button>';
    html += '<div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;padding-right:24px;">' + esc(course.brand) + '</div>';
    html += '<div style="font-size:16px;font-weight:800;color:#fff;line-height:1.3;">' + esc(course.title) + '</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:3px;">' + esc(course.subtitle) + '</div>';
    html += '<div style="margin-top:12px;">';
    html += '<span style="background:' + lvlCol + '33;border:1px solid ' + lvlCol + '55;color:' + lvlCol + ';font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;margin-right:6px;">' + esc(course.level) + '</span>';
    html += '<span style="background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.85);font-size:10px;padding:2px 8px;border-radius:20px;">' + esc(course.duration) + '</span>';
    html += '</div></div>';

    // Card body
    html += '<div style="padding:16px 20px;">';
    html += '<p style="font-size:12px;color:#64748b;line-height:1.6;margin:0 0 12px;">' + esc(course.description) + '</p>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px;">' + tagHtml + '</div>';

    // Progress
    html += '<div style="margin-bottom:12px;">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:5px;">';
    html += '<span style="font-size:11px;font-weight:700;color:#475569;">Progress</span>';
    html += '<span style="font-size:11px;font-weight:700;color:#7c3aed;">' + doneSteps + ' / ' + totalSteps + ' steps</span>';
    html += '</div>';
    html += '<div style="background:#f1f5f9;border-radius:10px;height:6px;overflow:hidden;">';
    html += '<div style="background:linear-gradient(90deg,#7c3aed,#a78bfa);height:100%;width:' + pct + '%;border-radius:10px;"></div>';
    html += '</div></div>';

    // CTA button
    html += '<button onclick="window.tlOpenCourse(\'' + course.id + '\')" style="width:100%;background:linear-gradient(135deg,#7c3aed,#6d28d9);border:none;border-radius:10px;padding:10px;color:white;font-size:13px;font-weight:700;cursor:pointer;">' + btnLabel + '</button>';
    html += '</div></div>';
  }
  html += '</div></div>';
  container.innerHTML = html;
}

window.tlViewStats = function() {
  _tlState.view = 'stats';
  window.renderTrainingLibrary();
};

async function _renderStatsDashboard(container) {
  var html = '<div style="padding:28px 32px;max-width:1400px;margin:0 auto;font-family:\'Inter\',sans-serif;">';
  
  // Header
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">';
  html += '<div>';
  html += '<h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 4px;">';
  html += '<i class="fas fa-chart-pie" style="color:#7c3aed;margin-right:10px;"></i>Training Admin Stats</h1>';
  html += '<p style="font-size:13px;color:#64748b;margin:0;">System-wide course completions</p>';
  html += '</div>';
  html += '<button onclick="window.tlBackToLibrary()" style="background:white;color:#64748b;border:1px solid #e2e8f0;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;"><i class="fas fa-arrow-left" style="margin-right:8px;"></i>Back to Library</button>';
  html += '</div>';

  html += '<div id="tl-stats-content" style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Loading stats...</div>';
  html += '</div>';
  container.innerHTML = html;

  try {
    if (!window.electron || !window.electron.invoke) throw new Error("IPC unavailable");
    var res = await window.electron.invoke('supabase:query', {
      table: 'training_progress',
      method: 'select',
      params: { columns: '*' }
    });
    if (!res || res.error) throw new Error(res.error || "Failed to fetch stats");

    var records = res.data || [];
    records.sort((a,b) => new Date(b.completed_at) - new Date(a.completed_at));

    var totalCompletions = records.length;
    var totalScore = 0;
    var totalQ = 0;
    records.forEach(r => { totalScore += (r.score || 0); totalQ += (r.total_questions || 0); });
    var avgScore = totalQ > 0 ? Math.round((totalScore / totalQ) * 100) : 0;

    // Metrics
    var contentHtml = '<div style="display:flex;gap:20px;margin-bottom:28px;">';
    contentHtml += '<div style="flex:1;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:16px;padding:24px;color:white;box-shadow:0 10px 25px rgba(124,58,237,0.2);">';
    contentHtml += '<div style="font-size:13px;font-weight:600;opacity:0.9;">Total Course Completions</div>';
    contentHtml += '<div style="font-size:36px;font-weight:800;margin-top:8px;">' + totalCompletions + '</div>';
    contentHtml += '</div>';

    contentHtml += '<div style="flex:1;background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 4px 12px rgba(0,0,0,0.02);">';
    contentHtml += '<div style="font-size:13px;font-weight:600;color:#64748b;">Average Score</div>';
    contentHtml += '<div style="font-size:36px;font-weight:800;color:#0f172a;margin-top:8px;">' + avgScore + '%</div>';
    contentHtml += '</div>';
    contentHtml += '</div>';

    // Table
    contentHtml += '<div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.02);">';
    contentHtml += '<table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left;">';
    contentHtml += '<thead><tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#475569;">';
    contentHtml += '<th style="padding:16px 20px;font-weight:700;">User</th>';
    contentHtml += '<th style="padding:16px 20px;font-weight:700;">Course</th>';
    contentHtml += '<th style="padding:16px 20px;font-weight:700;">Score</th>';
    contentHtml += '<th style="padding:16px 20px;font-weight:700;">Completed At</th>';
    contentHtml += '</tr></thead><tbody>';

    if (records.length === 0) {
      contentHtml += '<tr><td colspan="4" style="padding:30px;text-align:center;color:#94a3b8;">No courses completed yet.</td></tr>';
    } else {
      records.forEach(r => {
        var pct = r.total_questions > 0 ? Math.round((r.score / r.total_questions) * 100) : 0;
        var color = pct >= 80 ? '#10b981' : (pct >= 50 ? '#f59e0b' : '#ef4444');
        var date = new Date(r.completed_at).toLocaleString();

        contentHtml += '<tr style="border-bottom:1px solid #f1f5f9;">';
        contentHtml += '<td style="padding:16px 20px;color:#0f172a;font-weight:600;">' + esc(r.user_email) + '</td>';
        contentHtml += '<td style="padding:16px 20px;color:#475569;">' + esc(r.course_title || r.course_id) + '</td>';
        contentHtml += '<td style="padding:16px 20px;"><span style="background:' + color + '15;color:' + color + ';padding:4px 8px;border-radius:6px;font-weight:700;font-size:12px;">' + r.score + '/' + r.total_questions + ' (' + pct + '%)</span></td>';
        contentHtml += '<td style="padding:16px 20px;color:#64748b;font-size:12px;">' + date + '</td>';
        contentHtml += '</tr>';
      });
    }

    contentHtml += '</tbody></table></div>';
    var contentDiv = document.getElementById('tl-stats-content');
    if (contentDiv) contentDiv.innerHTML = contentHtml;

  } catch (err) {
    console.error(err);
    var contentDiv = document.getElementById('tl-stats-content');
    if (contentDiv) contentDiv.innerHTML = '<div style="color:#ef4444;">Failed to load stats: ' + err.message + '</div>';
  }
}

// ── COURSE PLAYER ─────────────────────────────────────────────────────────────
function _renderCoursePlayer(container) {
  var course = _tlState.course;
  if (!course) { _tlState.view = 'library'; window.renderTrainingLibrary(); return; }

  // Build flat step list
  var allSteps = [];
  for (var si = 0; si < course.sections.length; si++) {
    for (var sti = 0; sti < course.sections[si].steps.length; sti++) {
      allSteps.push({ si: si, sti: sti, id: course.sections[si].steps[sti].id });
    }
  }
  var section = course.sections[_tlState.sectionIdx];
  var step = section && section.steps[_tlState.stepIdx];
  if (!step) return;

  var cur = -1;
  for (var ai = 0; ai < allSteps.length; ai++) {
    if (allSteps[ai].id === step.id) { cur = ai; break; }
  }
  var total = allSteps.length;
  var pct = Math.round((cur / Math.max(1, total - 1)) * 100);

  // ── Sidebar HTML ──
  var sidebarHtml = '';
  for (var si4 = 0; si4 < course.sections.length; si4++) {
    var sec = course.sections[si4];
    sidebarHtml += '<div style="margin-bottom:4px;">';
    sidebarHtml += '<div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;padding:8px 10px 4px;">' + esc(sec.title) + '</div>';
    for (var sti4 = 0; sti4 < sec.steps.length; sti4++) {
      var st = sec.steps[sti4];
      var isDone = !!_tlState.completed[st.id];
      var isCur  = si4 === _tlState.sectionIdx && sti4 === _tlState.stepIdx;
      var bg2    = isCur ? '#f5f3ff' : 'transparent';
      var col2   = isCur ? '#7c3aed' : '#475569';
      var fw2    = isCur ? '700' : '500';
      var cbg2   = isDone ? '#10b981' : (isCur ? '#7c3aed' : '#e2e8f0');
      var ccol2  = (isDone || isCur) ? 'white' : '#94a3b8';
      var icon2  = isDone ? '&#10003;' : String(sti4 + 1);
      sidebarHtml += '<div onclick="window.tlGoToStep(' + si4 + ',' + sti4 + ')" style="padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;background:' + bg2 + ';border-left:3px solid ' + (isCur ? '#7c3aed' : 'transparent') + ';margin-bottom:2px;">';
      sidebarHtml += '<div style="min-width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;background:' + cbg2 + ';color:' + ccol2 + ';">' + icon2 + '</div>';
      sidebarHtml += '<div style="font-size:12px;font-weight:' + fw2 + ';color:' + col2 + ';line-height:1.3;">' + esc(st.title) + '</div>';
      sidebarHtml += '</div>';
    }
    sidebarHtml += '</div>';
  }

  var prevDisabled = cur === 0;
  var isLast = cur >= total - 1;
  var prevBtn = '<button onclick="window.tlPrevStep()" ' + (prevDisabled ? 'disabled' : '') + ' style="background:' + (prevDisabled ? '#f1f5f9' : 'white') + ';border:1px solid ' + (prevDisabled ? '#e2e8f0' : '#cbd5e1') + ';border-radius:10px;padding:10px 22px;font-size:13px;font-weight:700;color:' + (prevDisabled ? '#94a3b8' : '#475569') + ';cursor:' + (prevDisabled ? 'not-allowed' : 'pointer') + ';">' + (prevDisabled ? 'Start' : '&#8592; Previous') + '</button>';
  var nextBtn = isLast
    ? '<button onclick="window.tlFinishCourse()" style="background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:10px;padding:10px 22px;font-size:13px;font-weight:700;color:white;cursor:pointer;">&#10003; Complete Course</button>'
    : '<button onclick="window.tlNextStep()" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border:none;border-radius:10px;padding:10px 22px;font-size:13px;font-weight:700;color:white;cursor:pointer;">Next &#8594;</button>';

  var navBar = '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 24px;background:white;border-top:1px solid #e2e8f0;flex-shrink:0;">';
  navBar += prevBtn;
  navBar += '<div style="font-size:12px;color:#94a3b8;font-weight:600;">Step ' + (cur + 1) + ' of ' + total + '</div>';
  navBar += nextBtn;
  navBar += '</div>';

  // ── Outer shell ──
  var html = '<div style="display:flex;height:calc(100vh - 42px);overflow:hidden;background:#f8fafc;">';

  // ── Sidebar ──
  html += '<div style="width:240px;min-width:240px;background:white;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;">';
  html += '<div style="padding:10px 14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;">';
  html += '<button onclick="window.tlBackToLibrary()" style="background:#f1f5f9;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;color:#475569;cursor:pointer;"><i class="fas fa-arrow-left" style="margin-right:3px;"></i>Library</button>';
  html += '<div style="font-size:11px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;">' + esc(course.title) + '</div>';
  html += '</div>';
  html += '<div style="overflow-y:auto;flex:1;padding:6px;">' + sidebarHtml + '</div>';
  html += '<div style="padding:10px 14px;border-top:1px solid #f1f5f9;">';
  html += '<div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;margin-bottom:5px;">';
  html += '<span style="color:#475569;">Progress</span><span style="color:#7c3aed;">' + (cur + 1) + ' / ' + total + '</span>';
  html += '</div>';
  html += '<div style="background:#f1f5f9;border-radius:10px;height:5px;">';
  html += '<div style="background:linear-gradient(90deg,#7c3aed,#a78bfa);height:100%;width:' + pct + '%;border-radius:10px;"></div>';
  html += '</div></div></div>';

  // ── Main content area ──
  var isProc = step.type === 'step' && step.video;
  if (isProc) {
    // SPLIT LAYOUT: left = video panel (fixed), right = procedure panel (scrollable)
    html += '<div style="flex:1;display:flex;overflow:hidden;">';

    // Left: video panel — scrollable, natural video height
    var secTitle = course.sections[_tlState.sectionIdx] ? course.sections[_tlState.sectionIdx].title : '';
    html += '<div style="flex:0 0 52%;display:flex;flex-direction:column;background:#fff;border-right:1px solid #e2e8f0;overflow-y:auto;">';
    // Step badges + title
    html += '<div style="padding:16px 20px 12px;flex-shrink:0;">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">';
    html += '<div style="background:linear-gradient(135deg,' + course.color1 + ',' + course.color2 + ');color:white;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;">STEP ' + esc(step.step_number) + '</div>';
    html += '<div style="background:#f5f3ff;color:#7c3aed;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;">' + esc(secTitle) + '</div>';
    html += '</div>';
    html += '<h2 style="font-size:17px;font-weight:800;color:#0f172a;margin:0;line-height:1.3;">' + esc(step.title) + '</h2>';
    html += '</div>';
    // Video player — natural 16:9 height, wraps tightly to content
    html += '<div style="width:100%;background:#f8fafc;">';
    html += _renderVideoNode(step.video, step.poster);
    html += '</div>';
    // Body text below video
    html += '<div style="padding:12px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;">';
    html += '<p style="font-size:12px;color:#475569;line-height:1.6;margin:0;">' + esc(step.body) + '</p>';
    html += '</div>';
    html += '</div>'; // end left panel

    // Right: procedure + tools + notes + nav
    html += '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">';
    html += '<div style="flex:1;overflow-y:auto;padding:20px 24px;">';
    html += _renderProcedureContent(step);
    html += '</div>';
    html += navBar;
    html += '</div>'; // end right panel

    html += '</div>'; // end split wrapper
  } else {
    // SINGLE COLUMN: title, warning, quiz — centered, scrollable
    html += '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">';
    html += '<div style="flex:1;overflow-y:auto;padding:32px 48px;">';
    html += _renderStep(step, course);
    html += '</div>';
    html += navBar;
    html += '</div>';
  }

  html += '</div>'; // end outer shell
  container.innerHTML = html;
}


// ── STEP RENDERERS ────────────────────────────────────────────────────────────
function _renderStep(step, course) {
  if (step.type === 'title')   return _renderTitleStep(step, course);
  if (step.type === 'warning') return _renderWarningStep(step);
  if (step.type === 'step')    return _renderProcedureStep(step, course);
  if (step.type === 'quiz')    return _renderQuizStep(step);
  return '<div style="padding:20px;color:#94a3b8;">Unknown step type: ' + esc(step.type) + '</div>';
}

function _renderTitleStep(step, course) {
  var h = '<div style="text-align:center;max-width:720px;margin:32px auto;">';
  // Video or poster image
  if (step.video) {
    h += '<div style="border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.10);margin-bottom:28px;background:#f8fafc;">';
    h += _renderVideoNode(step.video, step.poster);
    h += '</div>';
  } else if (step.poster) {
    h += '<div style="border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.18);margin-bottom:28px;">';
    h += '<img src="' + step.poster + '" alt="' + esc(step.title) + '" style="width:100%;display:block;max-height:400px;object-fit:cover;">';
    h += '</div>';
  } else {
    h += '<div style="width:80px;height:80px;background:linear-gradient(135deg,' + course.color1 + ',' + course.color2 + ');border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 24px;">&#9881;</div>';
  }
  h += '<h1 style="font-size:28px;font-weight:800;color:#0f172a;margin:0 0 12px;">' + esc(step.title) + '</h1>';
  h += '<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 32px;">' + esc(step.body) + '</p>';
  h += '<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:16px 24px;display:inline-block;">';
  h += '<div style="font-size:13px;color:#7c3aed;font-weight:700;"><i class="fas fa-info-circle" style="margin-right:6px;"></i>' + esc(step.note) + '</div>';
  h += '</div></div>';
  return h;
}

function _renderWarningStep(step) {
  var h = '<div style="max-width:680px;margin:0 auto;">';
  // Poster image (only if a valid URL provided)
  if (step.poster) {
    h += '<div id="_warnposter" style="border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(220,38,38,0.15);margin-bottom:20px;">';
    h += '<img src="' + step.poster + '" alt="Safety" style="width:100%;display:block;max-height:320px;object-fit:cover;" onerror="this.parentElement.style.display=\'none\'">';
    h += '</div>';
  }
  // Warning header banner
  h += '<div style="background:linear-gradient(135deg,#dc2626,#b91c1c);border-radius:16px 16px 0 0;padding:20px 28px;display:flex;align-items:center;gap:14px;">';
  h += '<div style="width:44px;height:44px;background:rgba(255,255,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">';
  h += '<i class="fas fa-exclamation-triangle" style="color:white;font-size:20px;"></i></div>';
  h += '<div><div style="font-size:11px;font-weight:800;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Mandatory Safety Requirement</div>';
  h += '<div style="font-size:18px;font-weight:800;color:white;">' + esc(step.title) + '</div></div>';
  h += '</div>';
  // Body
  h += '<div style="background:#fff5f5;border:2px solid #fca5a5;border-top:none;border-radius:0 0 16px 16px;padding:20px 28px;">';
  h += '<p style="font-size:13px;color:#92400e;line-height:1.6;margin:0 0 16px;font-weight:600;">' + esc(step.body) + '</p>';
  // PPE items as icon cards
  var icons = ['fas fa-vest','fas fa-shoe-prints','fas fa-hard-hat','fas fa-glasses','fas fa-ear-deaf','fas fa-hand-paper'];
  h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px;">';
  for (var bi = 0; bi < step.bullets.length; bi++) {
    var icon = icons[bi] || 'fas fa-check-circle';
    h += '<div style="background:white;border:1px solid #fca5a5;border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;">';
    h += '<div style="width:30px;height:30px;background:#fee2e2;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">';
    h += '<i class="' + icon + '" style="color:#dc2626;font-size:13px;"></i></div>';
    h += '<span style="font-size:12px;color:#7c2d12;font-weight:600;line-height:1.4;">' + esc(step.bullets[bi]) + '</span>';
    h += '</div>';
  }
  h += '</div>';
  // Lock-out note
  if (step.note) {
    h += '<div style="background:#dc2626;border-radius:10px;padding:12px 16px;display:flex;align-items:flex-start;gap:10px;">';
    h += '<i class="fas fa-lock" style="color:white;margin-top:2px;flex-shrink:0;"></i>';
    h += '<div style="font-size:12px;color:white;font-weight:700;line-height:1.5;">' + esc(step.note) + '</div></div>';
  }
  h += '</div></div>';
  return h;
}

// ── PROCEDURE CONTENT (right-panel text only, no video) ───────────────────────
function _renderProcedureContent(step) {
  var h = '';
  // Procedure list
  h += '<div style="background:white;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:16px;">';
  h += '<div style="background:#f8fafc;padding:10px 18px;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.8px;">';
  h += '<i class="fas fa-list-ol" style="color:#7c3aed;margin-right:6px;"></i>Procedure</div>';
  for (var pi = 0; pi < step.procedure.length; pi++) {
    var isLastP = pi === step.procedure.length - 1;
    h += '<div style="display:flex;gap:12px;padding:13px 18px;border-bottom:' + (isLastP ? 'none' : '1px solid #f1f5f9') + ';align-items:flex-start;">';
    h += '<div style="min-width:24px;height:24px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:white;flex-shrink:0;">' + (pi + 1) + '</div>';
    h += '<div style="font-size:13px;color:#334155;line-height:1.6;padding-top:2px;">' + esc(step.procedure[pi]) + '</div>';
    h += '</div>';
  }
  h += '</div>';
  // Tools
  if (step.tools) {
    h += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:13px 16px;margin-bottom:12px;">';
    h += '<div style="font-size:10px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:7px;"><i class="fas fa-tools" style="margin-right:5px;"></i>Tools Required</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
    for (var tli = 0; tli < step.tools.length; tli++) {
      h += '<span style="background:white;border:1px solid #86efac;color:#166534;font-size:11px;font-weight:600;padding:3px 9px;border-radius:8px;">' + esc(step.tools[tli]) + '</span>';
    }
    h += '</div></div>';
  }
  // Caution
  if (step.caution) {
    h += '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:13px 16px;margin-bottom:12px;display:flex;gap:10px;align-items:flex-start;">';
    h += '<i class="fas fa-exclamation-triangle" style="color:#ea580c;margin-top:2px;flex-shrink:0;"></i>';
    h += '<div style="font-size:12px;color:#7c2d12;font-weight:600;line-height:1.5;"><strong>CAUTION:</strong> ' + esc(step.caution) + '</div></div>';
  }
  // Note
  if (step.note) {
    h += '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:13px 16px;display:flex;gap:10px;align-items:flex-start;">';
    h += '<i class="fas fa-info-circle" style="color:#0369a1;margin-top:2px;flex-shrink:0;"></i>';
    h += '<div style="font-size:12px;color:#0c4a6e;font-weight:600;line-height:1.5;">' + esc(step.note) + '</div></div>';
  }
  return h;
}

function _renderProcedureStep(step, course) {
  // Used only in single-column fallback (no video steps)
  var secTitle = (_tlState.course && _tlState.course.sections[_tlState.sectionIdx]) ? _tlState.course.sections[_tlState.sectionIdx].title : '';
  var h = '<div style="max-width:820px;">';
  h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">';
  h += '<div style="background:linear-gradient(135deg,' + course.color1 + ',' + course.color2 + ');color:white;font-size:11px;font-weight:800;padding:4px 12px;border-radius:20px;">STEP ' + esc(step.step_number) + '</div>';
  h += '<div style="background:#f5f3ff;color:#7c3aed;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;">' + esc(secTitle) + '</div>';
  h += '</div>';
  h += '<h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 10px;">' + esc(step.title) + '</h2>';
  if (step.poster) {
    h += '<div style="border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.1);margin-bottom:20px;">';
    h += '<img src="' + step.poster + '" alt="' + esc(step.title) + '" style="width:100%;display:block;max-height:320px;object-fit:cover;">';
    h += '</div>';
  }
  h += '<p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px;">' + esc(step.body) + '</p>';
  h += _renderProcedureContent(step);
  h += '</div>';
  return h;
}

function _renderQuizStep(step) {
  var qs = step.questions;
  var submitted = _tlState.quizSubmitted;
  var score = 0;
  if (submitted) {
    for (var qi2 = 0; qi2 < qs.length; qi2++) {
      if (_tlState.quizAnswers[qi2] === qs[qi2].correct) score++;
    }
  }

  var h = '<div style="max-width:780px;">';
  h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">';
  h += '<div style="background:linear-gradient(135deg,#0369a1,#0284c7);color:white;font-size:11px;font-weight:800;padding:4px 12px;border-radius:20px;">KNOWLEDGE CHECK</div>';
  h += '</div>';
  h += '<h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 6px;">' + esc(step.title) + '</h2>';
  h += '<p style="font-size:13px;color:#64748b;margin:0 0 24px;">Answer all questions to test your understanding.</p>';

  if (submitted) {
    var good2 = score >= 4;
    h += '<div style="background:' + (good2 ? '#f0fdf4' : '#fff7ed') + ';border:2px solid ' + (good2 ? '#86efac' : '#fed7aa') + ';border-radius:14px;padding:20px 24px;margin-bottom:24px;text-align:center;">';
    h += '<div style="font-size:22px;font-weight:800;color:' + (good2 ? '#166534' : '#c2410c') + ';">' + score + ' / ' + qs.length + ' Correct</div>';
    h += '<div style="font-size:13px;color:#64748b;margin-top:6px;">' + (score === qs.length ? 'Perfect score! Excellent work.' : (good2 ? 'Well done! Review any incorrect answers below.' : 'Please review the course material and try again.')) + '</div>';
    if (score < 4) h += '<button onclick="window.tlResetQuiz()" style="margin-top:14px;background:#f59e0b;border:none;border-radius:8px;padding:8px 20px;font-size:12px;font-weight:700;color:white;cursor:pointer;">Retry Quiz</button>';
    h += '</div>';
  }

  for (var qi3 = 0; qi3 < qs.length; qi3++) {
    var q = qs[qi3];
    var chosen = _tlState.quizAnswers[qi3];
    var isCorrect2 = submitted && chosen === q.correct;
    var isWrong2   = submitted && chosen !== undefined && chosen !== q.correct;
    var boxBrd = isCorrect2 ? '#86efac' : (isWrong2 ? '#fca5a5' : '#e2e8f0');
    h += '<div style="background:white;border:1px solid ' + boxBrd + ';border-radius:14px;padding:20px;margin-bottom:16px;">';
    h += '<div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;line-height:1.5;">';
    h += '<span style="color:#7c3aed;margin-right:6px;">Q' + (qi3 + 1) + '.</span>' + esc(q.q) + '</div>';
    for (var oi = 0; oi < q.options.length; oi++) {
      var bg3 = '#f8fafc', brd3 = '#e2e8f0', col3 = '#475569', fw3 = '500';
      if (submitted) {
        if (oi === q.correct)   { bg3 = '#f0fdf4'; brd3 = '#86efac'; col3 = '#166534'; fw3 = '700'; }
        else if (oi === chosen) { bg3 = '#fef2f2'; brd3 = '#fca5a5'; col3 = '#dc2626'; fw3 = '700'; }
      } else if (chosen === oi) { bg3 = '#f5f3ff'; brd3 = '#c4b5fd'; col3 = '#7c3aed'; fw3 = '700'; }
      var clickAttr = !submitted ? 'onclick="window.tlSelectAnswer(' + qi3 + ',' + oi + ')"' : '';
      var iconHtml = submitted && oi === q.correct ? '&#10003;' : (submitted && oi === chosen ? '&#10007;' : String.fromCharCode(65 + oi));
      h += '<div ' + clickAttr + ' style="background:' + bg3 + ';border:1px solid ' + brd3 + ';border-radius:10px;padding:10px 14px;cursor:' + (submitted ? 'default' : 'pointer') + ';display:flex;align-items:center;gap:10px;margin-bottom:6px;">';
      h += '<div style="min-width:20px;height:20px;border-radius:50%;border:2px solid ' + brd3 + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:' + col3 + ';flex-shrink:0;">' + iconHtml + '</div>';
      h += '<span style="font-size:13px;font-weight:' + fw3 + ';color:' + col3 + ';">' + esc(q.options[oi]) + '</span>';
      h += '</div>';
    }
    if (submitted && q.explanation) {
      h += '<div style="margin-top:12px;padding:10px 14px;background:#f0f9ff;border-radius:8px;font-size:12px;color:#0c4a6e;font-weight:600;">';
      h += '<i class="fas fa-lightbulb" style="color:#0369a1;margin-right:6px;"></i>' + esc(q.explanation) + '</div>';
    }
    h += '</div>';
  }

  if (!submitted) {
    h += '<div style="margin-top:8px;">';
    h += '<button onclick="window.tlSubmitQuiz()" style="background:linear-gradient(135deg,#0369a1,#0284c7);border:none;border-radius:10px;padding:12px 28px;font-size:14px;font-weight:800;color:white;cursor:pointer;">';
    h += '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit Answers</button>';
    h += '</div>';
  }
  h += '</div>';
  return h;
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
window.tlOpenCourse = function(courseId) {
  var course = null;
  for (var i = 0; i < TRAINING_COURSES.length; i++) {
    if (TRAINING_COURSES[i].id === courseId) { course = TRAINING_COURSES[i]; break; }
  }
  if (!course) return;
  _tlState.course = course; _tlState.view = 'player';
  _tlState.sectionIdx = 0; _tlState.stepIdx = 0;
  _tlState.quizSubmitted = false; _tlState.quizAnswers = {};
  window.renderTrainingLibrary();
};
window.tlBackToLibrary = function() {
  _tlState.view = 'library'; _tlState.course = null;
  _tlState.quizSubmitted = false; _tlState.quizAnswers = {};
  window.renderTrainingLibrary();
};
window.tlGoToStep = function(si, sti) {
  _tlState.sectionIdx = si; _tlState.stepIdx = sti;
  _tlState.quizSubmitted = false; _tlState.quizAnswers = {};
  window.renderTrainingLibrary();
};
window.tlNextStep = function() {
  var course = _tlState.course;
  var step = course.sections[_tlState.sectionIdx] && course.sections[_tlState.sectionIdx].steps[_tlState.stepIdx];
  if (step) _tlState.completed[step.id] = true;
  var section = course.sections[_tlState.sectionIdx];
  if (_tlState.stepIdx < section.steps.length - 1) {
    _tlState.stepIdx++;
  } else if (_tlState.sectionIdx < course.sections.length - 1) {
    _tlState.sectionIdx++; _tlState.stepIdx = 0;
  }
  _tlState.quizSubmitted = false; _tlState.quizAnswers = {};
  window.renderTrainingLibrary();
};
window.tlPrevStep = function() {
  if (_tlState.stepIdx > 0) {
    _tlState.stepIdx--;
  } else if (_tlState.sectionIdx > 0) {
    _tlState.sectionIdx--;
    _tlState.stepIdx = _tlState.course.sections[_tlState.sectionIdx].steps.length - 1;
  }
  _tlState.quizSubmitted = false; _tlState.quizAnswers = {};
  window.renderTrainingLibrary();
};
window.tlFinishCourse = function() {
  var course = _tlState.course;
  var step = course.sections[_tlState.sectionIdx] && course.sections[_tlState.sectionIdx].steps[_tlState.stepIdx];
  if (step) _tlState.completed[step.id] = true;
  _tlState.view = 'library'; _tlState.course = null;
  window.renderTrainingLibrary();
  if (window.salestrack && window.salestrack.showToast) {
    window.salestrack.showToast('Course completed! Well done.', 'success');
  }
};
window.tlSelectAnswer = function(qi, oi) {
  _tlState.quizAnswers[qi] = oi;
  window.renderTrainingLibrary();
};
window.tlSubmitQuiz = async function() {
  var step = _tlState.course && _tlState.course.sections[_tlState.sectionIdx] && _tlState.course.sections[_tlState.sectionIdx].steps[_tlState.stepIdx];
  var totalQ = (step && step.questions && step.questions.length) || 0;
  if (Object.keys(_tlState.quizAnswers).length < totalQ) {
    if (window.salestrack && window.salestrack.showToast) {
      window.salestrack.showToast('Please answer all ' + totalQ + ' questions before submitting.', 'warning');
    }
    return;
  }
  
  // Calculate score
  var score = 0;
  for (var i = 0; i < totalQ; i++) {
    if (_tlState.quizAnswers[i] === step.questions[i].correctIndex) {
      score++;
    }
  }
  
  // Save to DB
  var userEmail = localStorage.getItem('ft_user_email') || localStorage.getItem('omnisUser') || 'anonymous';
  if (window.electron && window.electron.invoke) {
    try {
      await window.electron.invoke('supabase:query', {
        table: 'training_progress',
        method: 'insert',
        data: {
          user_email: userEmail,
          course_id: _tlState.course.id,
          course_title: _tlState.course.title,
          score: score,
          total_questions: totalQ,
          status: 'completed'
        }
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }
  
  _tlState.quizSubmitted = true;
  _tlState.lastScore = score;
  window.renderTrainingLibrary();
};
window.tlResetQuiz = function() {
  _tlState.quizSubmitted = false; _tlState.quizAnswers = {};
  window.renderTrainingLibrary();
};
  window.tlDeleteCourse = function(courseId) {
    if (!confirm("Are you sure you want to delete this course?")) return;
    for (var i = 0; i < TRAINING_COURSES.length; i++) {
      if (TRAINING_COURSES[i].id === courseId) {
        TRAINING_COURSES.splice(i, 1);
        break;
      }
    }
    window.renderTrainingLibrary();
  };

  window._tlWebviewBuffer = [];

  window.tlOpenInAppBrowser = function() {
    window._tlWebviewBuffer = [];
    var ex = document.getElementById('tl-add-course-modal');
    if (ex) ex.remove();
    var wvEx = document.getElementById('tl-webview-modal');
    if (wvEx) wvEx.remove();
    
    var modal = document.createElement('div');
    modal.id = 'tl-webview-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.8);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:"Inter",sans-serif;';
    
    var html = '<div style="background:white;border-radius:16px;width:90vw;height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 50px rgba(0,0,0,0.3);overflow:hidden;">';
    
    // Header & URL Bar
    html += '<div style="padding:16px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:12px;background:#f8fafc;">';
    html += '<h2 style="margin:0;font-size:16px;font-weight:800;color:#0f172a;white-space:nowrap;"><i class="fas fa-globe" style="color:#7c3aed;margin-right:8px;"></i>Portal Browser</h2>';
    html += '<div style="flex:1;display:flex;gap:8px;">';
    html += '<input type="text" id="tl-wv-url" value="https://google.com" style="flex:1;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;outline:none;" onkeydown="if(event.key===\'Enter\') document.getElementById(\'tl-wv-go\').click()">';
    html += '<button id="tl-wv-go" style="background:#e2e8f0;border:none;border-radius:6px;padding:0 16px;font-weight:700;color:#334155;cursor:pointer;">Go</button>';
    html += '<button id="tl-wv-back" style="background:transparent;border:none;color:#64748b;cursor:pointer;padding:0 10px;"><i class="fas fa-arrow-left"></i></button>';
    html += '</div>';
    html += '<button onclick="this.closest(\'#tl-webview-modal\').remove()" style="background:transparent;border:none;cursor:pointer;color:#64748b;font-size:16px;margin-left:12px;"><i class="fas fa-times"></i></button>';
    html += '</div>';
    
    // Webview
    html += '<div style="flex:1;background:#f1f5f9;position:relative;">';
    html += '<webview id="tl-wv" src="https://google.com" style="width:100%;height:100%;display:flex;"></webview>';
    html += '</div>';
    
    // Footer & Extract Buttons
    html += '<div style="padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:white;">';
    html += '<div style="display:flex;align-items:center;gap:16px;">';
    html += '<div style="font-size:12px;color:#64748b;">Navigate to the training and click Capture for each page.</div>';
    html += '<div id="tl-wv-badge" style="display:none;background:#fef3c7;color:#d97706;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;"><i class="fas fa-layer-group" style="margin-right:4px;"></i><span id="tl-wv-count">0</span> Pages Captured</div>';
    html += '</div>';

    html += '<div style="display:flex;gap:12px;">';
    html += '<button onclick="this.closest(\'#tl-webview-modal\').remove()" style="background:transparent;border:none;color:#64748b;font-weight:600;font-size:13px;cursor:pointer;">Cancel</button>';
    html += '<button id="tl-btn-capture" style="background:white;color:#0f172a;border:1px solid #e2e8f0;border-radius:8px;padding:12px 20px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 1px 2px rgba(0,0,0,0.05);"><i class="fas fa-camera"></i> Capture Current Page</button>';
    html += '<button id="tl-btn-extract" style="background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;border-radius:8px;padding:12px 24px;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:8px;"><i class="fas fa-bolt"></i> Generate Course</button>';
    html += '</div></div></div>';
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    
    var wv = document.getElementById('tl-wv');
    var urlInp = document.getElementById('tl-wv-url');
    
    document.getElementById('tl-wv-go').onclick = function() {
      var u = urlInp.value.trim();
      if (u && !u.startsWith('http')) u = 'https://' + u;
      wv.loadURL(u);
    };
    document.getElementById('tl-wv-back').onclick = function() {
      if (wv.canGoBack()) wv.goBack();
    };
    wv.addEventListener('did-navigate', function(e) {
      urlInp.value = e.url;
    });
    
    document.getElementById('tl-btn-capture').onclick = async function() {
      var btn = this;
      var origHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Capturing...';
      btn.disabled = true;
      try {
        var outerHTML = await wv.executeJavaScript('document.documentElement.outerHTML');
        var innerText = await wv.executeJavaScript('document.body.innerText');
        
        var foundVideos = [];
        var ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+)/g;
        var matches = outerHTML.match(ytRegex);
        if (matches) foundVideos = [...new Set(matches)];
        
        window._tlWebviewBuffer.push({ text: innerText, videos: foundVideos });
        
        document.getElementById('tl-wv-badge').style.display = 'inline-block';
        document.getElementById('tl-wv-count').innerText = window._tlWebviewBuffer.length;
        
        if (window.salestrack && window.salestrack.showToast) {
          window.salestrack.showToast("Page captured! Buffer: " + window._tlWebviewBuffer.length + " page(s)", "success");
        }
      } catch (err) {
        console.error("Capture failed:", err);
      }
      btn.innerHTML = origHtml;
      btn.disabled = false;
    };
    
    document.getElementById('tl-btn-extract').onclick = async function() {
      var btn = this;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
      btn.disabled = true;
      
      try {
        // If buffer is empty, automatically capture the current page
        if (window._tlWebviewBuffer.length === 0) {
          document.getElementById('tl-btn-capture').click();
          // Wait briefly for capture to finish
          await new Promise(r => setTimeout(r, 1000));
        }
        
        var combinedText = "";
        var allVideos = [];
        window._tlWebviewBuffer.forEach((p, i) => {
            combinedText += "--- PAGE " + (i+1) + " ---\\n" + p.text + "\\n\\n";
            allVideos = allVideos.concat(p.videos);
        });
        allVideos = [...new Set(allVideos)];
        
        var contentToProcess = combinedText + '\\n\\nFound Videos: ' + allVideos.join(', ');
        
        if (!window.electron || !window.electron.invoke) throw new Error("IPC unavailable");
        var res = await window.electron.invoke('supabase:edgeFunction', {
          name: 'ai-marketing-assistant',
          data: { task: 'create_course', content: contentToProcess, tone: '' }
        });
        if (!res || res.error) throw new Error(res?.error || "Unknown edge function error");
        
        var courseData = res.data;
        if (!courseData.id) courseData.id = 'ai-course-' + Date.now();
        
        TRAINING_COURSES.push(courseData);
        if (window.salestrack && window.salestrack.showToast) {
          window.salestrack.showToast("Course successfully created from " + window._tlWebviewBuffer.length + " pages!", "success");
        }
        
        window._tlWebviewBuffer = [];
        document.getElementById('tl-webview-modal').remove();
        window.renderTrainingLibrary();
        
      } catch (err) {
        if (window.salestrack && window.salestrack.showToast) {
          window.salestrack.showToast("Extraction failed: " + err.message, "error");
        }
        btn.innerHTML = '<i class="fas fa-bolt"></i> Generate Course';
        btn.disabled = false;
      }
    };
  };

  window.tlAddCourse = function() {
    var ex = document.getElementById('tl-add-course-modal');
    if (ex) ex.remove();
    
    var modal = document.createElement('div');
    modal.id = 'tl-add-course-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:"Inter",sans-serif;';
    
    var html = '<div style="background:white;border-radius:16px;width:520px;padding:24px;box-shadow:0 20px 40px rgba(0,0,0,0.2);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
    html += '<h2 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;"><i class="fas fa-magic" style="color:#7c3aed;margin-right:8px;"></i>AI Course Importer</h2>';
    html += '<button onclick="this.closest(\'#tl-add-course-modal\').remove()" style="background:transparent;border:none;cursor:pointer;color:#64748b;font-size:16px;"><i class="fas fa-times"></i></button>';
    html += '</div>';
    html += '<p style="font-size:13px;color:#475569;margin:0 0 16px;line-height:1.5;">Paste a link to a training article or YouTube video, <b>OR</b> paste raw text content. For password-protected portals, <button onclick="window.tlOpenInAppBrowser()" style="background:transparent;border:none;color:#7c3aed;font-weight:700;cursor:pointer;padding:0;font-size:13px;text-decoration:underline;">open the In-App Browser</button>.</p>';
    
    html += '<div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px;">URL Link (Public)</div>';
    html += '<input type="text" id="tl-course-url" placeholder="https://example.com/training" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;margin-bottom:16px;outline:none;">';
    
    html += '<div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px;">OR Raw Text</div>';
    html += '<textarea id="tl-course-text" placeholder="Copy & paste training materials here..." style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;height:120px;resize:vertical;margin-bottom:20px;outline:none;font-family:inherit;"></textarea>';
    
    html += '<div style="display:flex;justify-content:flex-end;gap:12px;">';
    html += '<button onclick="this.closest(\'#tl-add-course-modal\').remove()" style="background:transparent;border:none;color:#64748b;font-weight:600;font-size:13px;cursor:pointer;">Cancel</button>';
    html += '<button id="tl-btn-import" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;">Generate Course</button>';
    html += '</div></div>';
    modal.innerHTML = html;
    document.body.appendChild(modal);
    
    setTimeout(function(){ var inp=document.getElementById('tl-course-url'); if(inp) inp.focus(); }, 50);
    
    document.getElementById('tl-btn-import').onclick = async function() {
      var url = document.getElementById('tl-course-url').value.trim();
      var rawText = document.getElementById('tl-course-text').value.trim();
      
      if (!url && !rawText) {
        if (window.salestrack && window.salestrack.showToast) window.salestrack.showToast("Please provide a URL or raw text.", "error");
        return;
      }
      
      var contentToProcess = rawText ? rawText : url;
      var btn = this;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
      btn.disabled = true;
      try {
        if (!window.electron || !window.electron.invoke) throw new Error("IPC unavailable");
        var res = await window.electron.invoke('supabase:edgeFunction', {
          name: 'ai-marketing-assistant',
          data: { task: 'create_course', content: contentToProcess, tone: '' }
        });
        if (!res || res.error) throw new Error(res?.error || "Unknown edge function error");
        
        var courseData = res.data;
        if (!courseData.id) courseData.id = 'ai-course-' + Date.now();
        
        TRAINING_COURSES.push(courseData);
        if (window.salestrack && window.salestrack.showToast) {
          window.salestrack.showToast("Course successfully created!", "success");
        }
        
        document.getElementById('tl-add-course-modal').remove();
        window.renderTrainingLibrary();
        
      } catch (err) {
        if (window.salestrack && window.salestrack.showToast) {
          window.salestrack.showToast("Import failed: " + err.message, "error");
        }
        btn.innerHTML = 'Generate Course';
        btn.disabled = false;
      }
    };
  };

console.log('[TrainingLibrary] v4 ready. renderTrainingLibrary:', typeof window.renderTrainingLibrary);