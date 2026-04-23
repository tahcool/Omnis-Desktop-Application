(function () {
    // ---------------- BASIC CONFIG ----------------
    const root_element = document.querySelector(".fin-cal-wrapper");
    if (!root_element) {
        console.error("Finance Calendar: Root element .fin-cal-wrapper not found.");
        return;
    }

    const now = new Date();
    let currentYear = now.getFullYear();
    let currentMonthIndex = now.getMonth();
    let currentViewMode = "week"; // 'week' or 'month'
    const MAX_BADGES_PER_DAY = 3;
    const MAX_UPCOMING_ITEMS = 8;

    // CHANGE THESE TO REAL EMAILS
    const PREDEFINED_EMAILS = [
        "groupaccounts@example.com",
        "finance@example.com",
        "ibu.manager@example.com"
    ];

    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ];

    // ------------ EVENT DEFINITIONS ------------

    // Weekly recurring items (blue) – every week
    const RECURRING_EVENTS_TEMPLATE = [
        {
            weekday: 1,
            title:
                "Credit Limit Notification Email to be sent by IBU Debtors. (by 11:00)"
        },
        {
            weekday: 1,
            title: "Active Jobs Email to be sent by AS. (by 12:00 midday)"
        },
        {
            weekday: 3,
            title:
                "Cashflow signed by IBU Manager and submitted to Group Accounts. (by 12:00)"
        },
        {
            weekday: 3,
            title:
                "Debtors with comments on outstanding balances, signed off by IBU Manager and submitted to Group Director. (by 12:00)"
        },
        {
            weekday: 5,
            title:
                "Weekly Attendance Register to be submitted to Group Accounts. (by 13:00)"
        }
    ];

    // Monthly items (yellow) – repeat every month on same day-of-month
    const MONTHLY_EVENTS_TEMPLATE = [
        {
            date: "2025-11-05",
            title:
                "Monthly Statutory Reports to be signed by IBU Manager and submitted to Group Accounts."
        },
        {
            date: "2025-11-05",
            title: "Account Holders List to be signed off and circulated."
        },
        {
            date: "2025-11-07",
            title:
                "FMX Management Accounts (MA), AS to return signed MA to Group Accounts."
        },
        {
            date: "2025-11-10",
            title:
                "VAT to be signed off by IBU Manager and submitted to Group Accounts."
        },
        {
            date: "2025-11-10",
            title:
                "Major Trading Debtors/Defaulters Report to be submitted to Group Accounts."
        },
        {
            date: "2025-11-15",
            title: "Creditors Recons to be submitted to AS."
        },
        {
            date: "2025-11-15",
            title:
                "Accounts On Hold Recommendation List to be signed off and circulated."
        },
        {
            date: "2025-11-15",
            title:
                "Month End Reports (MER) to be submitted to Accounts Supervisor."
        },
        {
            date: "2025-11-15",
            title: "Monthly Reporting Signed Checklist."
        },
        {
            date: "2025-11-19",
            title:
                "Management Accounts (MA) – AS to return signed MA to Group Accounts. AS to submit MA to IBU Manager by 13th November 2025."
        },
        {
            date: "2025-11-19",
            title: "Creditors Review to be submitted to Group Accounts."
        },
        {
            date: "2025-11-20",
            title:
                "Wage Sheets to be signed off by IBU Manager. Pay Day 25th November 2025."
        },
        {
            date: "2025-11-30",
            title:
                "Stock Takes: TMG, ENG, SRD, SPS, SPW, SPE PDC, SPE BYO. (By end of November 2025)"
        }
    ];

    // -------------- UTILITIES --------------
    const weekdayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weekdayLong = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];
    const monthShort = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];

    function dateKey(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    function parseIsoDate(iso) {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y, m - 1, d);
    }

    function formatDisplayDate(d) {
        const wd = weekdayShort[(d.getDay() + 6) % 7];
        const day = d.getDate();
        const m = monthShort[d.getMonth()];
        const y = d.getFullYear();
        return `${wd} ${day} ${m} ${y}`;
    }

    function sameDay(a, b) {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    // ---------- Zimbabwe Public Holidays & Shutdown ----------

    function getEasterSunday(year) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month, day);
    }

    function isZimbabweHoliday(date) {
        const year = date.getFullYear();
        const m = date.getMonth();
        const d = date.getDate();

        if (m === 0 && d === 1) return true; // New Year's Day
        if (m === 3 && d === 18) return true; // Independence Day
        if (m === 4 && d === 1) return true; // Workers' Day
        if (m === 4 && d === 25) return true; // Africa Day
        if (m === 11 && d === 22) return true; // National Unity Day
        if (m === 11 && d === 25) return true; // Christmas
        if (m === 11 && d === 26) return true; // Boxing Day

        if (m === 7) {
            const firstOfAug = new Date(year, 7, 1);
            const dow = firstOfAug.getDay();
            const offsetToMonday = (8 - dow) % 7;
            const firstMonday = 1 + offsetToMonday;
            const heroesDay = firstMonday + 7;
            const defenceDay = heroesDay + 1;
            if (d === heroesDay || d === defenceDay) return true;
        }

        const easterSunday = getEasterSunday(year);
        const goodFriday = new Date(
            year,
            easterSunday.getMonth(),
            easterSunday.getDate() - 2
        );
        const easterSaturday = new Date(
            year,
            easterSunday.getMonth(),
            easterSunday.getDate() - 1
        );
        const easterMonday = new Date(
            year,
            easterSunday.getMonth(),
            easterSunday.getDate() + 1
        );

        if (sameDay(date, goodFriday)) return true;
        if (sameDay(date, easterSaturday)) return true;
        if (sameDay(date, easterMonday)) return true;

        return false;
    }

    // Annual shutdown: 19 Dec – 12 Jan
    function isClosureDay(date) {
        const m = date.getMonth();
        const d = date.getDate();
        if (m === 11 && d >= 19) return true; // 19–31 Dec
        if (m === 0 && d <= 12) return true; // 1–12 Jan
        return false;
    }

    function isWeekend(date) {
        const dow = date.getDay();
        return dow === 0 || dow === 6;
    }

    function adjustForNonWorkingDay(original) {
        const adj = new Date(original.getTime());
        let moved = false;
        while (isWeekend(adj) || isZimbabweHoliday(adj) || isClosureDay(adj)) {
            adj.setDate(adj.getDate() - 1);
            moved = true;
        }
        return { adjusted: adj, moved };
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttr(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function getHeadline(text) {
        const t = String(text || "").trim();
        if (!t) return "";
        const separators = [".", "–", "-", ":"];
        let idx = t.length;
        separators.forEach((sep) => {
            const i = t.indexOf(sep);
            if (i > 0 && i < idx) idx = i;
        });
        let head = t.slice(0, idx).trim();
        if (head.length > 40) head = head.slice(0, 37) + "...";
        return head;
    }

    // -------------- EVENTS STATE --------------

    const allEvents = []; // { id, title, recurring, date, moved_from }
    let EVENT_ID_COUNTER = 1;

    function initEventsForCurrentMonth() {
        allEvents.length = 0;
        EVENT_ID_COUNTER = 1;

        const lastDay = new Date(
            currentYear,
            currentMonthIndex + 1,
            0
        ).getDate();

        // Weekly recurring (blue)
        for (let day = 1; day <= lastDay; day++) {
            const d = new Date(currentYear, currentMonthIndex, day);
            const jsDow = d.getDay();

            RECURRING_EVENTS_TEMPLATE.forEach((tmpl) => {
                if (jsDow === tmpl.weekday) {
                    allEvents.push({
                        id: EVENT_ID_COUNTER++,
                        title: tmpl.title,
                        recurring: true,
                        date: new Date(d.getTime()),
                        moved_from: null
                    });
                }
            });
        }

        // Monthly recurring (yellow)
        MONTHLY_EVENTS_TEMPLATE.forEach((tmpl) => {
            const templateDate = parseIsoDate(tmpl.date);
            let dayOfMonth = templateDate.getDate();

            if (dayOfMonth > lastDay) {
                dayOfMonth = lastDay;
            }

            const baseDate = new Date(currentYear, currentMonthIndex, dayOfMonth);
            const { adjusted, moved } = adjustForNonWorkingDay(baseDate);

            allEvents.push({
                id: EVENT_ID_COUNTER++,
                title: tmpl.title,
                recurring: false,
                date: adjusted,
                moved_from: moved ? baseDate : null
            });
        });
    }

    function buildEventsIndex() {
        const map = {};
        allEvents.forEach((ev) => {
            const key = dateKey(ev.date);
            if (!map[key]) map[key] = [];
            map[key].push(ev);
        });
        return map;
    }

    function findEventById(id) {
        return allEvents.find((ev) => ev.id === id);
    }

    // -------------- RENDER MONTH GRID --------------

    function renderCalendar(root_element) {
        const grid = root_element.querySelector(".fin-cal-grid");
        if (!grid) return;

        const eventsByDate = buildEventsIndex();
        const lastDay = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
        const first = new Date(currentYear, currentMonthIndex, 1);
        const firstIndex = first.getDay(); // 0 = Sun
        const totalCells = 42; // 6 weeks

        // Determine range to render based on View Mode
        let startCell = 0;
        let endCell = totalCells;

        if (currentViewMode === "week") {
            // Find "target date": Today if in current month, else 1st
            const now = new Date();
            let targetDay = 1;
            if (
                currentYear === now.getFullYear() &&
                currentMonthIndex === now.getMonth()
            ) {
                targetDay = now.getDate();
            }
            // Calculate which row (week) this day falls into
            // cellIndex = dayNum + firstIndex - 1
            // But dayNum is 1-based.
            const targetIndex = targetDay + firstIndex - 1;
            const rowStart = Math.floor(targetIndex / 7) * 7;

            startCell = rowStart;
            endCell = rowStart + 7;
        }

        let html = "";

        // Inject Legend if missing (Check globally, not just in loop)
        if (!root_element.querySelector(".fin-cal-legend")) {
            const legendHtml = `
                    <div class="fin-cal-legend">
                        <div class="fin-legend-item">
                            <div class="fin-legend-dot weekly"></div>
                            <span>Weekly Recurring</span>
                        </div>
                        <div class="fin-legend-item">
                            <div class="fin-legend-dot monthly"></div>
                            <span>Monthly / One-time</span>
                        </div>
                    </div>`;
            const topbar = root_element.querySelector(".fin-cal-topbar");
            if (topbar) topbar.insertAdjacentHTML('afterend', legendHtml);
        }

        // Render Loop
        for (let cell = startCell; cell < endCell; cell++) {
            // Logic for day number
            const dayNum = cell - firstIndex + 1;

            if (dayNum < 1 || dayNum > lastDay) {
                html += '<div class="fin-cal-cell fin-cal-cell--empty"></div>';
                continue;
            }

            const d = new Date(currentYear, currentMonthIndex, dayNum);
            const key = dateKey(d);
            const events = (eventsByDate[key] || []).slice().sort((a, b) => {
                if (a.recurring === b.recurring) return 0;
                return a.recurring ? -1 : 1;
            });

            const isWeekendFlag = isWeekend(d);
            const isHolidayFlag = isZimbabweHoliday(d) || isClosureDay(d);
            const isToday = sameDay(d, new Date());

            let cellClasses = "fin-cal-cell";
            if (isWeekendFlag) cellClasses += " fin-cal-cell--weekend";
            if (isHolidayFlag) cellClasses += " fin-cal-cell--holiday";
            if (isToday) cellClasses += " today";

            html += `<div class="${cellClasses}" data-date="${key}">`;
            html += `<div class="fin-cal-date">${dayNum}</div>`;

            if (events.length) {
                html += '<div class="fin-cal-events">';

                const visible = events.slice(0, MAX_BADGES_PER_DAY);
                const hidden = events.slice(MAX_BADGES_PER_DAY);

                visible.forEach((ev, idx) => {
                    const badgeClass = ev.recurring
                        ? "fin-cal-badge fin-cal-badge--weekly"
                        : "fin-cal-badge fin-cal-badge--monthly";

                    const num = String(idx + 1).padStart(2, "0");
                    const labelText = getHeadline(ev.title);

                    html += `<div class="${badgeClass}" draggable="true" data-event-id="${ev.id
                        }" title="${escapeAttr(ev.title)}">
            <span class="fin-cal-badge-num">${num}</span>
            <span class="fin-cal-badge-text">${escapeHtml(labelText)}</span>
          </div>`;
                });

                if (hidden.length) {
                    const moreTitle = hidden
                        .map((ev) => "- " + ev.title)
                        .join("\n");

                    html += `<div class="fin-cal-badge fin-cal-badge--more" data-date="${key}" title="${escapeAttr(
                        moreTitle
                    )}">
            <span class="fin-cal-badge-label">+${hidden.length}</span>
          </div>`;
                }

                html += "</div>";
            }

            html += "</div>";
        }

        grid.innerHTML = html;

        attachBadgeHandlers(root_element);
        attachDragDrop(root_element);

        // Update the View Toggle Button Text if it exists
        const viewBtn = root_element.querySelector(".fin-cal-view-toggle");
        if (viewBtn) {
            viewBtn.textContent = currentViewMode === "week" ? "View Full Month" : "Show Current Week";
        }
    }

    // -------------- UPCOMING LIST --------------

    function renderUpcoming(root_element) {
        const listEl = root_element.querySelector(".fin-upcoming-list");
        if (!listEl) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureEvents = allEvents
            .slice()
            .sort((a, b) => a.date - b.date)
            .filter((ev) => ev.date >= today)
            .slice(0, MAX_UPCOMING_ITEMS);

        if (!futureEvents.length) {
            listEl.innerHTML =
                '<div class="fin-upcoming-empty">No upcoming reports.</div>';
            return;
        }

        let html = "";
        let currentHeader = null;

        const labelForDate = (d) => {
            const dayDiff = Math.floor((d - today) / (24 * 60 * 60 * 1000));
            if (dayDiff === 0) return "Today";
            if (dayDiff === 1) return "Tomorrow";
            return formatDisplayDate(d);
        };

        futureEvents.forEach((ev) => {
            const label = labelForDate(ev.date);
            if (label !== currentHeader) {
                if (currentHeader !== null) {
                    html += "</div>";
                }
                currentHeader = label;
                html += `<div class="fin-upcoming-group"><div class="fin-upcoming-group-title">${escapeHtml(
                    label
                )}</div>`;
            }

            const headline = getHeadline(ev.title);

            html += `
        <div class="fin-upcoming-item" title="${escapeAttr(ev.title)}" data-event-id="${ev.id
                }">
          <div class="fin-upcoming-dot ${ev.recurring ? "weekly" : "monthly"
                }"></div>
          <div class="fin-upcoming-text">
            <div class="fin-upcoming-title">${escapeHtml(headline)}</div>
            <div class="fin-upcoming-sub">${formatDisplayDate(ev.date)}</div>
          </div>
        </div>`;
        });

        if (currentHeader !== null) {
            html += "</div>";
        }

        listEl.innerHTML = html;

        listEl
            .querySelectorAll(".fin-upcoming-item")
            .forEach((el) =>
                el.addEventListener("click", () => {
                    const id = parseInt(el.getAttribute("data-event-id"), 10);
                    if (!isNaN(id)) openEditModal(root_element, id);
                })
            );
    }

    // -------------- KPIs & TITLE --------------

    function updateMonthTitle(root_element) {
        const titleEl = root_element.querySelector(".fin-cal-month-title");
        const monthSelect = root_element.querySelector(".fin-cal-month-select");
        const yearSelect = root_element.querySelector(".fin-cal-year-select");

        const label = monthNames[currentMonthIndex] + " " + currentYear;

        if (titleEl) titleEl.textContent = label;
        if (monthSelect) monthSelect.value = String(currentMonthIndex);
        if (yearSelect) yearSelect.value = String(currentYear);
    }

    function updateKpis(root_element) {
        const nextTitleEl = root_element.querySelector(".fin-kpi-next-title");
        const nextDateEl = root_element.querySelector(".fin-kpi-next-date");
        const weekCountEl = root_element.querySelector(".fin-kpi-week-count");
        const monthCountEl = root_element.querySelector(".fin-kpi-month-count");
        const monthLabelEl = root_element.querySelector(".fin-kpi-month-label");
        const overdueCountEl = root_element.querySelector(".fin-kpi-overdue-count");

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (monthLabelEl) {
            monthLabelEl.textContent =
                monthNames[currentMonthIndex] + " " + currentYear;
        }

        if (!allEvents.length) {
            if (nextTitleEl) nextTitleEl.textContent = "No reports in this month";
            if (nextDateEl) nextDateEl.textContent = "";
            if (weekCountEl) weekCountEl.textContent = "0";
            if (monthCountEl) monthCountEl.textContent = "0";
            if (overdueCountEl) overdueCountEl.textContent = "0";
            return;
        }

        const eventsSorted = allEvents.slice().sort((a, b) => a.date - b.date);

        let upcoming = null;
        const sameMonthAsToday =
            currentYear === today.getFullYear() &&
            currentMonthIndex === today.getMonth();

        if (sameMonthAsToday) {
            upcoming = eventsSorted.find((ev) => ev.date >= today) || eventsSorted[0];
        } else {
            upcoming = eventsSorted[0];
        }

        if (upcoming) {
            if (nextTitleEl) nextTitleEl.textContent = upcoming.title;
            if (nextDateEl)
                nextDateEl.textContent = formatDisplayDate(upcoming.date);
        }

        if (monthCountEl) monthCountEl.textContent = String(allEvents.length);

        let weekCount = 0;
        if (sameMonthAsToday) {
            const startOfWeek = new Date(today);
            const dow = today.getDay();
            const diffToMonday = (dow + 6) % 7;
            startOfWeek.setDate(today.getDate() - diffToMonday);
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            weekCount = allEvents.filter(
                (ev) => ev.date >= startOfWeek && ev.date <= endOfWeek
            ).length;
        }
        if (weekCountEl) weekCountEl.textContent = String(weekCount);

        let overdue = 0;
        if (
            currentYear < today.getFullYear() ||
            (currentYear === today.getFullYear() &&
                currentMonthIndex <= today.getMonth())
        ) {
            overdue = allEvents.filter((ev) => ev.date < today).length;
        }
        if (overdueCountEl) overdueCountEl.textContent = String(overdue);
    }

    function drawDashboard(root_element) {
        if (!root_element) return;
        renderCalendar(root_element);
        renderUpcoming(root_element);
        updateMonthTitle(root_element);
        updateKpis(root_element);
    }

    // -------------- MODAL / EDIT --------------

    function openEditModal(root_element, eventId) {
        const ev = findEventById(eventId);
        if (!ev) return;

        const backdrop = root_element.querySelector(".fin-cal-modal-backdrop");
        const textArea = root_element.querySelector(".fin-cal-modal-text");
        const dateLabel = root_element.querySelector(".fin-cal-modal-date-label");
        const idInput = root_element.querySelector(".fin-cal-modal-id");

        textArea.value = ev.title;
        dateLabel.textContent = `Date: ${formatDisplayDate(ev.date)}`;
        idInput.value = String(eventId);
        backdrop.style.display = "flex";
    }

    function closeEditModal(root_element) {
        const backdrop = root_element.querySelector(".fin-cal-modal-backdrop");
        if (backdrop) backdrop.style.display = "none";
    }

    function setupModalButtons(root_element) {
        const btnSave = root_element.querySelector(".fin-cal-modal-save");
        const btnCancel = root_element.querySelector(".fin-cal-modal-cancel");
        const btnClose = root_element.querySelector(".fin-cal-modal-close");

        function cancel() {
            closeEditModal(root_element);
        }

        if (btnCancel) btnCancel.addEventListener("click", cancel);
        if (btnClose) btnClose.addEventListener("click", cancel);

        if (btnSave) {
            btnSave.addEventListener("click", function () {
                const idInput = root_element.querySelector(".fin-cal-modal-id");
                const textArea = root_element.querySelector(".fin-cal-modal-text");
                if (!idInput || !textArea) return;

                const id = parseInt(idInput.value, 10);
                const ev = findEventById(id);
                if (!ev) return;

                ev.title = textArea.value.trim() || ev.title;
                closeEditModal(root_element);
                drawDashboard(root_element);
            });
        }
    }

    function attachBadgeHandlers(root_element) {
        const badges = root_element.querySelectorAll(".fin-cal-badge");
        badges.forEach((badge) => {
            if (badge.classList.contains("fin-cal-badge--more")) {
                return;
            }
            badge.addEventListener("click", function (e) {
                if (e.defaultPrevented) return;
                const id = parseInt(badge.getAttribute("data-event-id"), 10);
                if (!isNaN(id)) openEditModal(root_element, id);
            });
        });
    }

    // -------------- DRAG & DROP --------------

    const dragState = { eventId: null };

    function attachDragDrop(root_element) {
        const badges = root_element.querySelectorAll(
            ".fin-cal-badge:not(.fin-cal-badge--more)"
        );
        const cells = root_element.querySelectorAll(".fin-cal-cell");

        badges.forEach((badge) => {
            badge.addEventListener("dragstart", function (e) {
                const id = parseInt(badge.getAttribute("data-event-id"), 10);
                dragState.eventId = id;
                if (e.dataTransfer) {
                    e.dataTransfer.setData("text/plain", String(id));
                    e.dataTransfer.effectAllowed = "move";
                }
                badge.classList.add("fin-cal-badge--dragging");
            });

            badge.addEventListener("dragend", function () {
                dragState.eventId = null;
                badge.classList.remove("fin-cal-badge--dragging");
            });
        });

        cells.forEach((cell) => {
            cell.addEventListener("dragover", function (e) {
                if (cell.getAttribute("data-date")) {
                    e.preventDefault();
                }
            });

            cell.addEventListener("drop", function (e) {
                e.preventDefault();
                const dateStr = cell.getAttribute("data-date");
                if (!dateStr) return;

                const data = e.dataTransfer
                    ? e.dataTransfer.getData("text/plain")
                    : null;
                const eventId = dragState.eventId || parseInt(data || "", 10);
                if (!eventId) return;

                const ev = findEventById(eventId);
                if (!ev) return;

                const newDate = parseIsoDate(dateStr);
                const oldDate = new Date(ev.date.getTime());

                const msg =
                    'Move "' +
                    ev.title +
                    '" from ' +
                    formatDisplayDate(oldDate) +
                    " to " +
                    formatDisplayDate(newDate) +
                    "?";

                const performMove = function () {
                    ev.date = newDate;
                    ev.moved_from = oldDate;
                    drawDashboard(root_element);
                };

                if (typeof frappe !== "undefined" && frappe.confirm) {
                    frappe.confirm(msg, performMove);
                } else if (window.confirm(msg)) {
                    performMove();
                }
            });
        });
    }

    // -------------- EMAIL BODY & SEND BUTTON --------------

    function buildEmailBody() {
        const eventsByDate = buildEventsIndex();
        const keys = Object.keys(eventsByDate).sort();

        const headerLabel =
            "Group Reporting Calendar – " +
            monthNames[currentMonthIndex] +
            " " +
            currentYear;

        let body =
            "<h3>" +
            headerLabel +
            "</h3>" +
            "<p>* Weekend dates, Zimbabwe public holidays, and the annual shutdown (19 Dec – 12 Jan) are shifted to the previous working day. Manual drag changes are reflected below.</p>" +
            '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;width:100%;">' +
            "<thead><tr><th style='background:#f5f5f5;'>Date</th><th style='background:#f5f5f5;'>Tasks Due</th></tr></thead><tbody>";

        keys.forEach((key) => {
            const d = parseIsoDate(key);
            const dateLabel = formatDisplayDate(d);
            const events = eventsByDate[key] || [];

            body += "<tr>";
            body += `<td valign='top'>${dateLabel}</td><td><ul>`;

            events.forEach((ev) => {
                body += "<li>" + escapeHtml(ev.title) + "</li>";
            });

            body += "</ul></td></tr>";
        });

        body += "</tbody></table>";
        return body;
    }

    function setupSendButton(root_element) {
        const btn = root_element.querySelector(".fin-cal-send-btn");
        if (!btn || typeof frappe === "undefined") return;

        btn.addEventListener("click", function () {
            const recipients = PREDEFINED_EMAILS.join(",");
            const subject =
                "Group Reporting Calendar – " +
                monthNames[currentMonthIndex] +
                " " +
                currentYear;
            const body = buildEmailBody();

            frappe.call({
                method:
                    "powerstar_salestrack.api.finance_calendar.send_finance_calendar_email",
                args: { recipients, subject, body },
                freeze: true,
                freeze_message: "Sending reminder email...",
                callback: function () {
                    frappe.msgprint("Reminder email sent to: " + recipients);
                },
                error: function () {
                    frappe.msgprint(
                        "There was a problem sending the reminder email. Please check the server logs."
                    );
                }
            });
        });
    }

    // -------------- MONTH NAVIGATION & SELECTS --------------

    function populateMonthYearSelects(root_element) {
        const monthSelect = root_element.querySelector(".fin-cal-month-select");
        const yearSelect = root_element.querySelector(".fin-cal-year-select");
        if (!monthSelect || !yearSelect) return;

        if (!monthSelect.options.length) {
            monthNames.forEach((name, idx) => {
                const opt = document.createElement("option");
                opt.value = String(idx);
                opt.textContent = name;
                monthSelect.appendChild(opt);
            });
        }

        const today = new Date();
        const startYear = today.getFullYear() - 1;
        const endYear = today.getFullYear() + 5;

        yearSelect.innerHTML = "";
        for (let y = startYear; y <= endYear; y++) {
            const opt = document.createElement("option");
            opt.value = String(y);
            opt.textContent = String(y);
            yearSelect.appendChild(opt);
        }
    }

    function setupMonthNavigation(root_element) {
        const prevBtn = root_element.querySelector(".fin-cal-prev");
        const nextBtn = root_element.querySelector(".fin-cal-next");
        const todayBtn = root_element.querySelector(".fin-cal-today");
        const monthSelect = root_element.querySelector(".fin-cal-month-select");
        const yearSelect = root_element.querySelector(".fin-cal-year-select");

        populateMonthYearSelects(root_element);
        updateMonthTitle(root_element);

        if (prevBtn) {
            prevBtn.addEventListener("click", function () {
                currentMonthIndex -= 1;
                if (currentMonthIndex < 0) {
                    currentMonthIndex = 11;
                    currentYear -= 1;
                }
                initEventsForCurrentMonth();
                drawDashboard(root_element);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", function () {
                currentMonthIndex += 1;
                if (currentMonthIndex > 11) {
                    currentMonthIndex = 0;
                    currentYear += 1;
                }
                initEventsForCurrentMonth();
                drawDashboard(root_element);
            });
        }

        if (todayBtn) {
            todayBtn.addEventListener("click", function () {
                const today = new Date();
                currentYear = today.getFullYear();
                currentMonthIndex = today.getMonth();
                initEventsForCurrentMonth();
                drawDashboard(root_element);
            });
        }

        if (monthSelect) {
            monthSelect.addEventListener("change", function () {
                const val = parseInt(monthSelect.value, 10);
                if (!isNaN(val)) {
                    currentMonthIndex = val;
                    initEventsForCurrentMonth();
                    drawDashboard(root_element);
                }
            });
        }

        if (yearSelect) {
            yearSelect.addEventListener("change", function () {
                const val = parseInt(yearSelect.value, 10);
                if (!isNaN(val)) {
                    currentYear = val;
                    initEventsForCurrentMonth();
                    drawDashboard(root_element);
                }
            });
        }
    }

    function setupViewToggle(root_element) {
        // Inject toggle button into the topbar if not present
        const topbar = root_element.querySelector(".fin-cal-topbar");
        if (!topbar || topbar.querySelector(".fin-cal-view-toggle")) return;

        // Create the button
        const btn = document.createElement("button");
        btn.className = "fin-cal-view-toggle"; // We can style this
        btn.style.cssText = "background:none; border:none; text-decoration:underline; cursor:pointer; font-weight:600; font-size:13px; color:#6366f1; margin-left:auto; margin-right:20px;";
        btn.textContent = currentViewMode === "week" ? "View Full Month" : "Show Current Week";

        // Insert before the Send Email button
        const sendBtn = topbar.querySelector(".fin-cal-send-btn");
        if (sendBtn) {
            topbar.insertBefore(btn, sendBtn);
        } else {
            topbar.appendChild(btn);
        }

        btn.addEventListener("click", () => {
            currentViewMode = currentViewMode === "week" ? "month" : "week";
            drawDashboard(root_element);
        });
    }

    // -------------- EMAIL SETTINGS LOGIC --------------

    // Default email configuration
    const DEFAULT_EMAIL_CONFIG = {
        default: "groupaccounts@example.com",
        me: "me@example.com",
        sino: "sino@example.com",
        trans: "trans@example.com"
    };

    function loadEmailSettings() {
        const stored = localStorage.getItem("fin_cal_emails");
        if (stored) {
            return JSON.parse(stored);
        }
        return DEFAULT_EMAIL_CONFIG;
    }

    function saveEmailSettings() {
        const config = {
            default: document.getElementById("email-setting-default").value,
            me: document.getElementById("email-setting-me").value,
            sino: document.getElementById("email-setting-sino").value,
            trans: document.getElementById("email-setting-trans").value
        };
        localStorage.setItem("fin_cal_emails", JSON.stringify(config));
        alert("Email settings saved successfully.");
        window.closeSettingsModal();
    }

    window.openSettingsModal = function () {
        const config = loadEmailSettings();
        document.getElementById("email-setting-default").value = config.default;
        document.getElementById("email-setting-me").value = config.me;
        document.getElementById("email-setting-sino").value = config.sino;
        document.getElementById("email-setting-trans").value = config.trans;

        document.getElementById("email-settings-modal").style.display = "flex";
    };

    window.closeSettingsModal = function () {
        document.getElementById("email-settings-modal").style.display = "none";
    };

    window.saveEmailSettings = saveEmailSettings;


    // -------------- EMAIL REMINDER LOGIC --------------

    function getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay(); // 0 (Sun) - 6 (Sat)
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    }

    function generateEmailPreview() {
        const today = new Date();
        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        const events = [];

        // Iterate through the week
        for (let i = 0; i < 7; i++) {
            const current = new Date(startOfWeek);
            current.setDate(current.getDate() + i);
            const dateStr = dateKey(current);
            const wd = current.getDay(); // 0-6

            // 1. Recurring Events
            RECURRING_EVENTS_TEMPLATE.forEach(tpl => {
                if (tpl.weekday === wd) {
                    events.push({
                        date: current,
                        dateStr: formatDisplayDate(current),
                        title: tpl.title
                    });
                }
            });

            // 2. Monthly Events
            MONTHLY_EVENTS_TEMPLATE.forEach(tpl => {
                // Parse template date to get day/month
                const tDate = parseIsoDate(tpl.date);
                // Check if this template matches current date (ignoring year for recurring month logic, OR assuming specific dates)
                // The template uses specific dates like "2025-11-05". The user prompt implies we are in a specific month or "current week".
                // Since the user image has "December 2025", and the template has "2025-11-xx", let's assume we map day-of-month.

                // ADJUSTMENT: We'll stick to the exact dates in template if they match, 
                // OR checking if the day-of-month matches (for monthly recurrence).
                // Let's assume monthly recurrence for now since we are "generating for current week".

                // Logic: If tpl.date's day matches current day
                if (tDate.getDate() === current.getDate()) {
                    // Check if we need to adjust for working day? 
                    // For simplicity, let's just add it if it strictly matches day of month.
                    events.push({
                        date: current,
                        dateStr: formatDisplayDate(current),
                        title: tpl.title
                    });
                }
            });
        }

        // Sort by date
        events.sort((a, b) => a.date - b.date);

        // Build HTML
        let html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p>Good day All,</p>
                <p>Please take note of the below requirements and their submission dates and times for the current week.</p>
                <br>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #333; color: #fff;">
                            <th style="padding: 10px; border: 1px solid #444; text-align: left;">Date / Time</th>
                            <th style="padding: 10px; border: 1px solid #444; text-align: left;">Requirement</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (events.length === 0) {
            html += `<tr><td colspan="2" style="padding: 10px; border: 1px solid #ccc; text-align: center;">No reports scheduled for this week.</td></tr>`;
        } else {
            events.forEach(e => {
                html += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ccc; width: 30%; font-weight: bold;">${e.dateStr}</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">${e.title}</td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
                <br>
                <p>Regards,<br><strong>Group Accounts</strong></p>
            </div>
        `;

        return html;
    }

    function setupSendButton(root_element) {
        const btn = root_element.querySelector(".fin-cal-send-btn");
        if (!btn) return;

        btn.addEventListener("click", () => {
            const content = generateEmailPreview();
            document.getElementById("email-preview-content").innerHTML = content;
            document.getElementById("email-preview-modal").style.display = "flex";
        });
    }

    // Expose Global Modal Functions
    window.closeEmailModal = function () {
        document.getElementById("email-preview-modal").style.display = "none";
    };

    window.confirmSendEmail = function () {
        const btnText = document.getElementById("send-btn-text");
        const originalText = btnText.textContent;

        btnText.textContent = "Sending...";

        // Load configurations
        const config = loadEmailSettings();
        // Collect all emails (simple logic: join all non-empty values)
        const recipients = [
            config.default,
            config.me,
            config.sino,
            config.trans
        ].filter(e => e).join(",");

        const content = document.getElementById("email-preview-content").innerHTML;

        // 1. Resolve Base URL
        let baseUrl = "https://salestrack.powerstar.co.zw"; // Default fallback
        try {
            const sysKey = localStorage.getItem("omnisSystemKey");
            // Hardcoded systems list from main index.html for reference
            const systems = [
                { key: "salestrack", baseUrl: "https://salestrack.powerstar.co.zw" },
                { key: "group_accounts", baseUrl: "https://salestrack.powerstar.co.zw" },
                { key: "fleetrack", baseUrl: "https://fleetrack.machinery-exchange.com" },
                { key: "engtrack", baseUrl: "https://engtrack.machinery-exchange.com" },
                { key: "powertrack", baseUrl: "https://powertrack.powerstar.co.zw" },
                { key: "omnis_parts", baseUrl: "https://omnis.spareparts-exchange.com" },
            ];
            const sys = systems.find(s => s.key === sysKey);
            if (sys && sys.baseUrl) {
                baseUrl = sys.baseUrl.replace(/\/$/, "");
            }
        } catch (e) {
            console.warn("Could not resolve base URL from localStorage, using default.");
        }

        // 2. Call Frappe API
        // Method path: powerstar_salestrack.omnis_dashboard.send_reminder
        const methodUrl = `${baseUrl}/api/method/powerstar_salestrack.omnis_dashboard.send_reminder`;

        fetch(methodUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: "include",
            body: JSON.stringify({
                recipients: recipients,
                subject: "Weekly Group Reports Reminder",
                content: content
            })
        })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (response.ok) {
                    return data;
                } else {
                    // Extract Frappe error message
                    // Frappe returns { exception: "...", _server_messages: "...", exc: "..." }
                    // or sometimes just { message: "..." } on throw

                    let errorMsg = "API call failed with status: " + response.status;

                    if (data._server_messages) {
                        try {
                            const msgs = JSON.parse(data._server_messages);
                            errorMsg = msgs.map(m => JSON.parse(m).message).join("\n");
                        } catch (e) { }
                    } else if (data.exception) {
                        errorMsg = data.exception;
                    } else if (data.message) {
                        errorMsg = data.message;
                    }

                    throw new Error(errorMsg);
                }
            })
            .then(() => {
                alert("Reminder email sent successfully to: " + recipients);
                window.closeEmailModal();
                btnText.textContent = originalText;
            })
            .catch(err => {
                console.error("Error sending email:", err);
                alert("Failed to send email.\nReason: " + err.message);
                btnText.textContent = originalText;
            });
    };

    // -------------- INIT --------------

    initEventsForCurrentMonth();
    drawDashboard(root_element);
    setupSendButton(root_element);
    setupModalButtons(root_element);
    setupMonthNavigation(root_element);
    setupViewToggle(root_element);
})();
