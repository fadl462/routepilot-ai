/* ============================================================
   RoutePilot AI — Application Logic
   ============================================================ */
(function () {
  'use strict';
  const D = window.RP_DATA;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ---------------- LOGIN ---------------- */
  const loginForm = $('#loginForm');
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    enterApp();
  });
  $('#demoLoginBtn').addEventListener('click', () => enterApp());

  function enterApp() {
    $('.login-screen').style.display = 'none';
    $('.app-shell').classList.add('active');
    renderDashboard();
    renderOptimizerView();
    renderTrailerView();
    renderConflictView();
    renderDeadheadView();
    renderHeatmapView();
    renderPromptBuilder();
    renderDataset();
    renderReports();
    renderMobileView();
    renderCustomerTimeline();
    initChat();
  }

  /* ---------------- THEME TOGGLE ---------------- */
  const themeBtn = $('#themeToggleBtn');
  function applyTheme(mode) {
    document.body.classList.toggle('theme-dark', mode === 'dark');
    themeBtn.textContent = mode === 'dark' ? '☀️' : '🌙';
    themeBtn.title = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    localStorage.setItem('rp-theme', mode);
  }
  applyTheme(localStorage.getItem('rp-theme') === 'dark' ? 'dark' : 'light');
  themeBtn.addEventListener('click', () => {
    applyTheme(document.body.classList.contains('theme-dark') ? 'light' : 'dark');
  });

  /* ---------------- TOPBAR DROPDOWNS ---------------- */
  function wireDropdown(btnId, panelId) {
    const btn = $('#' + btnId), panel = $('#' + panelId);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !panel.classList.contains('open');
      $$('.dropdown-panel').forEach(p => p.classList.remove('open'));
      if (willOpen) panel.classList.add('open');
    });
  }
  wireDropdown('notifBtn', 'notifPanel');
  wireDropdown('helpBtn', 'helpPanel');
  document.addEventListener('click', () => $$('.dropdown-panel').forEach(p => p.classList.remove('open')));

  /* ---------------- NAVIGATION ---------------- */
  $$('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });
  function switchView(name) {
    $$('.nav-item[data-view]').forEach(i => i.classList.toggle('active', i.dataset.view === name));
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
    const titles = {
      dashboard: ['Dashboard', 'Live snapshot of today\u2019s dispatch operation'],
      optimizer: ['Daily Optimizer', 'Feed in today\u2019s bookings and let RoutePilot build the plan'],
      routes: ['Today\u2019s Routes', 'Optimized driver-by-driver route plan'],
      drivers: ['Drivers', 'Roster, hubs, and live status'],
      trailers: ['Trailers', 'Assignment and load efficiency'],
      hubs: ['Rental Hubs', 'Hub configuration and coverage'],
      bookings: ['Bookings', 'Every booking on today\u2019s manifest'],
      map: ['Customer Map', 'Geographic view of today\u2019s demand'],
      dispatcher: ['AI Dispatcher', 'Talk to RoutePilot in plain language'],
      history: ['Optimization History', 'Past runs and their savings'],
      reports: ['Reports', 'Trends across the fleet'],
      settings: ['Settings', 'Business rules that govern every optimization'],
      promptbuilder: ['Prompt Builder', 'The reusable LLM prompt behind the platform'],
      mobiledriver: ['Driver Mobile View', 'What John sees on his phone this morning'],
      customertimeline: ['Customer Timeline', 'What your customer sees while they wait'],
    };
    const t = titles[name] || ['RoutePilot AI', ''];
    $('#topbarTitle').textContent = t[0];
    $('#topbarDate').textContent = t[1];
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Leaflet maps render blank if initialized while their container is display:none.
    // Fix: (re)validate size once the view is actually visible.
    if (name === 'routes' && resultsMap) {
      setTimeout(() => resultsMap.invalidateSize(), 80);
    }
    if (name === 'map') {
      if (!dailyMap) initDailyMap();
      else setTimeout(() => dailyMap.invalidateSize(), 80);
    }
    if (name === 'reports' && reportsChartInstance) {
      setTimeout(() => reportsChartInstance.resize(), 80);
    }
  }

  /* ---------------- TOOLTIP HELP ---------------- */
  function helpIcon(text) {
    return `<span class="tooltip-help" tabindex="0">?<span class="bubble">${text}</span></span>`;
  }

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function renderDashboard() {
    const s = D.stats;
    $('#dashStats').innerHTML = `
      <div class="card stat-card hoverable" data-nav="bookings"><div class="stat-icon">\u{1F4C5}</div>
        <div class="stat-label">Bookings Today</div><div class="stat-value">${s.bookingsToday}</div>
        <div class="stat-sub">across ${D.HUBS.length} hubs</div></div>
      <div class="card stat-card hoverable" data-nav="drivers"><div class="stat-icon">\u{1F468}\u200D\u2708\uFE0F</div>
        <div class="stat-label">Drivers</div><div class="stat-value">${s.driversActive} Active</div>
        <div class="stat-sub">of ${s.driversTotal} on roster</div></div>
      <div class="card stat-card hoverable" data-nav="trailers"><div class="stat-icon">\u26F3</div>
        <div class="stat-label">Golf Carts</div><div class="stat-value">${s.cartsScheduled}</div>
        <div class="stat-sub">Scheduled today</div></div>
      <div class="card stat-card hoverable" data-nav="reports"><div class="stat-icon">\u{1F4CA}</div>
        <div class="stat-label">Optimization Score ${helpIcon('How efficiently today\u2019s plan clusters stops and balances driver load, from 0\u2013100.')}</div>
        <div class="stat-value">${s.optimizationScore}%</div>
        <div class="stat-sub">On-time prediction ${s.onTimePrediction}%</div></div>
    `;
    $('#dashStats2').innerHTML = `
      <div class="card stat-card hoverable" data-nav="routes"><div class="stat-icon">\u{1F6E3}\uFE0F</div>
        <div class="stat-label">Estimated Mileage</div><div class="stat-value">${s.mileageAfter} mi</div>
        <div class="stat-sub">vs ${s.mileageBefore} mi unoptimized</div></div>
      <div class="card stat-card hoverable" data-nav="trailers"><div class="stat-icon">\u2705</div>
        <div class="stat-label">Potential Savings</div><div class="stat-value">${s.savingsMiles} mi</div>
        <div class="stat-sub">by clustering nearby stops</div></div>
      <div class="card stat-card hoverable" data-nav="reports"><div class="stat-icon">\u26FD</div>
        <div class="stat-label">Estimated Fuel Savings</div><div class="stat-value">$${s.fuelSavings}</div>
        <div class="stat-sub">at today\u2019s mileage rate</div></div>
      <div class="card stat-card hoverable" data-nav="trailers"><div class="stat-icon">\u{1F3AF}</div>
        <div class="stat-label">Conflicts Detected</div><div class="stat-value">${D.CONFLICTS.filter(c=>!c.within).length}</div>
        <div class="stat-sub warn">Needs dispatcher review</div></div>
    `;
    $$('#dashStats [data-nav], #dashStats2 [data-nav]').forEach(card => {
      card.addEventListener('click', () => document.querySelector(`.nav-item[data-view="${card.dataset.nav}"]`).click());
    });
    $('#opsFeed').innerHTML = `
      <div class="feed-item ok"><div class="ic">\u2713</div><div class="txt"><b>7 routes</b> fully optimized</div></div>
      <div class="feed-item warn"><div class="ic">\u26A0</div><div class="txt"><b>2 customer conflicts</b> detected \u2014 review in Conflict Detector</div></div>
      <div class="feed-item ok"><div class="ic">\u2713</div><div class="txt"><b>1 trailer reassignment</b> suggested for Hub B</div></div>
      <div class="feed-item ok"><div class="ic">\u2713</div><div class="txt"><b>4 bookings</b> automatically clustered near Downtown</div></div>
    `;
  }

  /* ============================================================
     DAILY OPTIMIZER
     ============================================================ */
  function renderOptimizerView() {
    $('#hubConfigList').innerHTML = D.HUBS.map(h => `
      <div class="hub-config-card">
        <div class="hub-name"><span class="hub-dot" style="background:${h.color}"></span>${h.name}</div>
        <div class="hub-inputs">
          <div><label>Drivers</label><input type="number" value="${h.drivers}" min="0" data-hub="${h.id}" data-field="drivers"></div>
          <div><label>Single Trailers</label><input type="number" value="${h.single}" min="0" data-hub="${h.id}" data-field="single"></div>
          <div><label>Double Trailers</label><input type="number" value="${h.double}" min="0" data-hub="${h.id}" data-field="double"></div>
        </div>
      </div>
    `).join('');

    $('#changeList').innerHTML = D.TODAYS_CHANGES.map((c, i) => `
      <label class="change-toggle">
        <input type="checkbox" ${i < 3 ? 'checked' : ''}>
        <span class="ic">${c.icon}</span>
        <span><b>${c.label}</b> \u2014 ${c.detail}</span>
      </label>
    `).join('');

    $('#pasteArea').value = D.BOOKINGS.slice(0, 6).map(b =>
      `${b.customer}\t${b.address}\t${b.phone}\t${b.deliveryTime}\t${b.pickupTime}\t${b.qty}\t${b.notes}`
    ).join('\n') + `\n... (${D.BOOKINGS.length - 6} more rows)`;

    $('#optimizeBtn').addEventListener('click', runOptimization);
  }

  const THINK_STEPS = [
    'Analyzing Bookings', 'Grouping Nearby Customers', 'Calculating Mileage',
    'Assigning Drivers', 'Balancing Trailer Loads', 'Predicting Traffic', 'Creating Final Schedule'
  ];

  function runOptimization() {
    const overlay = $('#thinkingOverlay');
    overlay.classList.add('active');
    const stepsEl = $('#thinkingSteps');
    stepsEl.innerHTML = THINK_STEPS.map((s, i) => `
      <div class="thinking-step" data-i="${i}">
        <div class="label">${s}</div>
        <div class="bar-track"><div class="bar-fill"></div></div>
        <div class="check">\u2713</div>
      </div>
    `).join('');
    const stepEls = $$('.thinking-step', stepsEl);
    let i = 0;
    function nextStep() {
      if (i > 0) stepEls[i - 1].classList.add('done');
      if (i >= stepEls.length) {
        setTimeout(() => {
          overlay.classList.remove('active');
          renderResultsView();
          switchView('routes');
        }, 400);
        return;
      }
      const el = stepEls[i];
      el.classList.add('active');
      requestAnimationFrame(() => { $('.bar-fill', el).style.width = '100%'; });
      i++;
      setTimeout(nextStep, 480);
    }
    nextStep();
  }

  /* ============================================================
     RESULTS / ROUTES VIEW  (map + driver cards + reasoning)
     ============================================================ */
  let resultsMap = null;
  let dailyMap = null;
  function initDailyMap() {
    dailyMap = L.map('dailyMap').setView([D.CENTER.lat, D.CENTER.lng], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 17 }).addTo(dailyMap);
    D.ROUTES.forEach(r => {
      r.stops.forEach(s => {
        L.circleMarker([s.lat, s.lng], { radius: 5, color: r.driver.color, fillColor: r.driver.color, fillOpacity: 0.85, weight: 1.5 })
          .bindPopup(`<b>${s.customer}</b><br>${s.address}<br>${s.phone}<br>ETA ${s.deliveryTime}<br>Cart qty: ${s.qty}`)
          .addTo(dailyMap);
      });
    });
    D.HUBS.forEach(h => {
      L.circleMarker([h.lat, h.lng], { radius: 9, color: '#0A2647', weight: 2, fillColor: '#fff', fillOpacity: 1 }).bindPopup(`<b>${h.name}</b>`).addTo(dailyMap);
    });
    setTimeout(() => dailyMap.invalidateSize(), 80);
  }
  let routeLayers = [];
  let activeDriverId = null;

  function renderResultsView() {
    $('#resultsSummary').innerHTML = `
      <div class="chip"><div class="v">18s</div><div class="l">Runtime</div></div>
      <div class="chip"><div class="v">${D.stats.savingsMiles} mi</div><div class="l">Mileage Reduced</div></div>
      <div class="chip"><div class="v">27%</div><div class="l">Deadhead Reduction</div></div>
      <div class="chip"><div class="v">98%</div><div class="l">Trailer Efficiency</div></div>
      <div class="chip"><div class="v">95%</div><div class="l">Conflict Resolution</div></div>
    `;

    if (!resultsMap) {
      resultsMap = L.map('resultsMap', { scrollWheelZoom: false }).setView([D.CENTER.lat, D.CENTER.lng], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 17
      }).addTo(resultsMap);
    }
    routeLayers.forEach(l => resultsMap.removeLayer(l));
    routeLayers = [];

    D.HUBS.forEach(h => {
      const m = L.circleMarker([h.lat, h.lng], { radius: 9, color: '#0A2647', weight: 2, fillColor: '#fff', fillOpacity: 1 }).addTo(resultsMap);
      m.bindTooltip(`<b>${h.name}</b><br>Hub`, { direction: 'top' });
      routeLayers.push(m);
    });

    D.ROUTES.forEach(r => {
      const latlngs = [[r.hub.lat, r.hub.lng], ...r.stops.map(s => [s.lat, s.lng]), [r.hub.lat, r.hub.lng]];
      const line = L.polyline(latlngs, { color: r.driver.color, weight: 3, opacity: 0.85, dashArray: '1 8', lineCap: 'round' }).addTo(resultsMap);
      routeLayers.push(line);
      r.stops.forEach((s, idx) => {
        const marker = L.circleMarker([s.lat, s.lng], { radius: 6, color: r.driver.color, weight: 2, fillColor: r.driver.color, fillOpacity: 0.9 }).addTo(resultsMap);
        marker.bindTooltip(
          `<b>${s.customer}</b><br>${s.address}<br>${s.phone}<br>ETA ${s.deliveryTime}<br>Window: 1 hr<br>Cart qty: ${s.qty}`,
          { direction: 'top' }
        );
        routeLayers.push(marker);
      });
    });

    $('#mapLegend').innerHTML = D.ROUTES.map(r => `
      <div class="leg"><span class="dot" style="background:${r.driver.color}"></span>${r.driver.name} \u2014 Hub ${r.hub.id}</div>
    `).join('');

    // driver cards
    $('#driverCards').innerHTML = D.ROUTES.map(r => `
      <div class="card driver-card hoverable" data-driver="${r.driver.id}">
        <div class="dc-head">
          <span class="dot" style="background:${r.driver.color}"></span>
          <span class="avatar">${r.driver.avatar}</span>
          <div><div class="name">${r.driver.name}</div><div class="hub">Hub ${r.hub.id} \u00b7 ${r.driver.status}</div></div>
        </div>
        <div class="dc-meta">
          <div>Load<span>${r.totalCarts} carts</span></div>
          <div>Trailer<span>${r.trailer}</span></div>
          <div>Mileage<span>${r.mileage} mi</span></div>
          <div>Utilization<span>${r.utilization}%</span></div>
        </div>
        <div class="timeline">
          ${r.stops.slice(0, 4).map(s => `<div class="t-stop"><span class="time">${s.deliveryTime}</span> <span class="who">${s.customer} \u2014 Delivery</span></div>`).join('')}
          ${r.stops.length > 4 ? `<div class="t-stop"><span class="who">+${r.stops.length - 4} more stops\u2026</span></div>` : ''}
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:14px;width:100%" data-open-route="${r.driver.id}">View Full Route \u2192</button>
      </div>
    `).join('');

    $$('[data-open-route]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openRouteModal(btn.dataset.openRoute);
    }));
    $$('.driver-card').forEach(card => card.addEventListener('click', () => highlightDriver(card.dataset.driver)));

    // AI reasoning panel
    $('#reasoningPanel').innerHTML = `
      <h3>\u{1F9E0} Why This Route?</h3>
      <div class="sub">RoutePilot explains every decision \u2014 it never just hands you a list.</div>
      <div class="reasoning-item"><div class="ic">\u{1F4CD}</div><div class="txt"><b>${D.BOOKINGS[3].customer}</b> and <b>${D.BOOKINGS[6].customer}</b> were grouped because they are only <b>2.3 miles</b> apart. This saved approximately <b>18 miles</b>.</div></div>
      <div class="reasoning-item"><div class="ic">\u2696\uFE0F</div><div class="txt">${D.ROUTES[1].driver.name} received the longer route because ${D.ROUTES[0].driver.name} had two pickup commitments at the same hour.</div></div>
      <div class="reasoning-item"><div class="ic">\u26FB\uFE0F</div><div class="txt">Double Trailer assigned to ${D.ROUTES[0].driver.name} because total load exceeded <b>4 carts</b>.</div></div>
      <div class="reasoning-item"><div class="ic">\u{1F6A6}</div><div class="txt">Traffic buffer of <b>15 minutes</b> applied near Downtown between 8\u20139am based on historical patterns.</div></div>
    `;

    renderConflictSummaryInline();
  }

  function highlightDriver(driverId) {
    activeDriverId = driverId;
    $$('.driver-card').forEach(c => c.style.outline = c.dataset.driver === driverId ? '2px solid var(--blue)' : 'none');
    const r = D.ROUTES.find(x => x.driver.id === driverId);
    if (r && resultsMap) resultsMap.flyTo([r.hub.lat, r.hub.lng], 12, { duration: 0.6 });
  }

  function renderConflictSummaryInline() {
    // small nod on the routes page pointing to conflict detector, kept minimal by design
  }

  /* ---- route detail modal ---- */
  let routeDetailMap = null;
  function openRouteModal(driverId) {
    const r = D.ROUTES.find(x => x.driver.id === driverId);
    if (!r) return;
    $('#modalTitle').textContent = `${r.driver.name}\u2019s Route \u2014 Hub ${r.hub.id}`;
    $('#modalBody').innerHTML = `
      <div class="route-map-modal-body">
        <div id="routeDetailMap"></div>
        <div class="stop-list">
          ${r.stops.map((s, idx) => `
            <div class="stop-row">
              <div class="num">${idx + 1}</div>
              <div class="info">
                <b>${s.customer}</b>
                <span>${s.address}</span>
                <span>${s.phone} \u00b7 ETA ${s.deliveryTime} \u00b7 ${s.qty} carts</span>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="grid grid-3" style="margin-top:18px">
        <div class="card card-pad"><div class="stat-label">Total Mileage</div><div class="stat-value" style="font-size:22px">${r.mileage} mi</div></div>
        <div class="card card-pad"><div class="stat-label">Trailer</div><div class="stat-value" style="font-size:22px">${r.trailer}</div></div>
        <div class="card card-pad"><div class="stat-label">Utilization</div><div class="stat-value" style="font-size:22px">${r.utilization}%</div></div>
      </div>
    `;
    $('#modalOverlay').classList.add('active');
    setTimeout(() => {
      if (routeDetailMap) { routeDetailMap.remove(); }
      routeDetailMap = L.map('routeDetailMap', { scrollWheelZoom: false }).setView([r.hub.lat, r.hub.lng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(routeDetailMap);
      const latlngs = [[r.hub.lat, r.hub.lng], ...r.stops.map(s => [s.lat, s.lng]), [r.hub.lat, r.hub.lng]];
      L.polyline(latlngs, { color: r.driver.color, weight: 4, dashArray: '2 9' }).addTo(routeDetailMap);
      L.circleMarker([r.hub.lat, r.hub.lng], { radius: 8, color: '#0A2647', fillColor: '#fff', fillOpacity: 1, weight: 2 }).bindTooltip('Hub').addTo(routeDetailMap);
      r.stops.forEach((s, idx) => {
        L.marker([s.lat, s.lng], { icon: L.divIcon({ className: '', html: `<div style="background:${r.driver.color};color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)">${idx + 1}</div>` }) })
          .bindTooltip(`<b>${s.customer}</b><br>${s.address}<br>ETA ${s.deliveryTime}`)
          .addTo(routeDetailMap);
      });
      routeDetailMap.fitBounds(latlngs);
    }, 60);
  }
  $('#modalClose').addEventListener('click', () => $('#modalOverlay').classList.remove('active'));
  $('#modalOverlay').addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') $('#modalOverlay').classList.remove('active'); });

  function openDetailModal(title, bodyHtml) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = bodyHtml;
    $('#modalOverlay').classList.add('active');
  }

  /* ---- driver profile modal ---- */
  function openDriverModal(driverId) {
    const r = D.ROUTES.find(x => x.driver.id === driverId);
    const d = D.DRIVERS.find(x => x.id === driverId);
    if (!d) return;
    const weekMiles = [34, 41, 29, 38, r ? r.mileage : 33];
    openDetailModal(`${d.fullName} \u2014 Driver Profile`, `
      <div style="display:flex;align-items:center;gap:16px">
        <div style="font-size:40px">${d.avatar}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:18px">${d.fullName}</div>
          <div style="color:var(--muted);font-size:13px">Hub ${d.hub} \u00b7 <span class="pill ${d.status === 'Active' ? 'pill-emerald' : 'pill-amber'}" style="margin-left:4px"><span class="pill-dot"></span>${d.status}</span></div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--emphasis)">\u2605 ${d.rating}</div>
          <div style="font-size:11px;color:var(--muted)">driver rating</div>
        </div>
      </div>

      <div class="grid grid-3" style="margin-top:18px">
        <div class="card card-pad"><div class="stat-label">Phone</div><div style="font-family:var(--font-mono);font-size:13px;margin-top:6px">${d.phone}</div></div>
        <div class="card card-pad"><div class="stat-label">Email</div><div style="font-family:var(--font-mono);font-size:12px;margin-top:6px;word-break:break-all">${d.email}</div></div>
        <div class="card card-pad"><div class="stat-label">Employed Since</div><div style="font-family:var(--font-mono);font-size:13px;margin-top:6px">${d.hireDate} \u00b7 ${d.tenureYears} yr${d.tenureYears===1?'':'s'}</div></div>
        <div class="card card-pad"><div class="stat-label">Vehicle</div><div style="font-size:13px;margin-top:6px;font-weight:600">${d.vehicle}</div></div>
        <div class="card card-pad"><div class="stat-label">Plate</div><div style="font-family:var(--font-mono);font-size:13px;margin-top:6px">${d.plate}</div></div>
        <div class="card card-pad"><div class="stat-label">Preferred Trailer</div><div style="font-size:13px;margin-top:6px;font-weight:600">${d.preferredTrailer}</div></div>
      </div>

      <div class="grid grid-3" style="margin-top:14px">
        <div class="card card-pad"><div class="stat-label">Total Deliveries</div><div class="stat-value" style="font-size:20px">${d.totalDeliveries.toLocaleString()}</div></div>
        <div class="card card-pad"><div class="stat-label">On-Time Rate</div><div class="stat-value" style="font-size:20px">${d.onTimeRate}%</div></div>
        <div class="card card-pad"><div class="stat-label">Safety Score</div><div class="stat-value" style="font-size:20px">${d.safetyScore}/100</div></div>
      </div>

      <div class="section-head" style="margin:20px 0 10px"><h3 style="font-size:14px">Certifications</h3></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${d.certifications.map(c => `<span class="pill pill-blue">\u2713 ${c}</span>`).join('')}
      </div>

      <div class="section-head" style="margin:20px 0 10px"><h3 style="font-size:14px">Today's Assignment</h3></div>
      <div class="grid grid-3">
        <div class="card card-pad"><div class="stat-label">Mileage</div><div class="stat-value" style="font-size:20px">${r ? r.mileage : '\u2014'} mi</div></div>
        <div class="card card-pad"><div class="stat-label">Utilization</div><div class="stat-value" style="font-size:20px">${r ? r.utilization : '\u2014'}%</div></div>
        <div class="card card-pad"><div class="stat-label">Trailer Today</div><div class="stat-value" style="font-size:20px">${r ? r.trailer : '\u2014'}</div></div>
      </div>

      <div class="section-head" style="margin:20px 0 10px"><h3 style="font-size:14px">Mileage \u2014 Last 5 Weekdays</h3></div>
      <div class="compare-bars" style="height:120px;gap:14px">
        ${weekMiles.map((m,i) => `<div class="compare-bar-col"><div class="val" style="font-size:11px">${m}</div><div class="compare-bar ${i===4?'after':'before'}" style="height:${Math.round(m/45*100)}%;width:40px"></div><div class="lbl" style="font-size:10.5px">${['Mon','Tue','Wed','Thu','Today'][i]}</div></div>`).join('')}
      </div>

      ${r ? `<div class="section-head" style="margin:20px 0 10px"><h3 style="font-size:14px">Today's Stops</h3></div>
      <div class="stop-list" style="max-height:220px">
        ${r.stops.map((s,idx) => `<div class="stop-row"><div class="num">${idx+1}</div><div class="info"><b>${s.customer}</b><span>${s.address} \u00b7 ETA ${s.deliveryTime}</span></div></div>`).join('')}
      </div>` : ''}
    `);
  }

  /* ---- hub profile modal ---- */
  function openHubModal(hubId) {
    const h = D.HUBS.find(x => x.id === hubId);
    if (!h) return;
    const hubDrivers = D.DRIVERS.filter(d => d.hub === hubId);
    const hubTrailers = D.TRAILERS.filter(t => t.hub === hubId);
    const hubRoutes = D.ROUTES.filter(r => r.hub.id === hubId);
    const totalMileage = hubRoutes.reduce((s, r) => s + r.mileage, 0).toFixed(1);
    const totalStops = hubRoutes.reduce((s, r) => s + r.stops.length, 0);
    openDetailModal(`${h.name}`, `
      <div class="grid grid-3">
        <div class="card card-pad"><div class="stat-label">Drivers</div><div class="stat-value" style="font-size:22px">${hubDrivers.length}</div></div>
        <div class="card card-pad"><div class="stat-label">Bookings Today</div><div class="stat-value" style="font-size:22px">${totalStops}</div></div>
        <div class="card card-pad"><div class="stat-label">Total Mileage</div><div class="stat-value" style="font-size:22px">${totalMileage} mi</div></div>
      </div>
      <div class="section-head" style="margin:20px 0 10px"><h3 style="font-size:14px">Drivers at this hub</h3></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${hubDrivers.map(d => `<div class="stop-row" style="cursor:pointer" data-driver-jump="${d.id}"><div style="font-size:18px">${d.avatar}</div><div class="info"><b>${d.name}</b><span>${d.status}</span></div></div>`).join('')}
      </div>
      <div class="section-head" style="margin:20px 0 10px"><h3 style="font-size:14px">Trailer Inventory</h3></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${hubTrailers.map(t => `<span class="pill ${t.type === 'Double' ? 'pill-blue' : 'pill-emerald'}">${t.id} \u00b7 ${t.type} (${t.capacity} carts)</span>`).join('')}
      </div>
    `);
    $$('[data-driver-jump]').forEach(row => row.addEventListener('click', () => openDriverModal(row.dataset.driverJump)));
  }

  /* ---- trailer detail modal ---- */
  function openTrailerModal(t) {
    openDetailModal(`${t.id} \u2014 ${t.type} Trailer`, `
      <div class="grid grid-3">
        <div class="card card-pad"><div class="stat-label">Driver</div><div class="stat-value" style="font-size:20px">${t.driver}</div></div>
        <div class="card card-pad"><div class="stat-label">Carts Loaded</div><div class="stat-value" style="font-size:20px">${t.carts}</div></div>
        <div class="card card-pad"><div class="stat-label">Efficiency</div><div class="stat-value" style="font-size:20px">${t.eff}%</div></div>
      </div>
      <div class="eff-bar-track" style="margin-top:18px;height:12px"><div class="eff-bar-fill" style="width:${t.eff}%"></div></div>
      <p style="margin-top:14px;font-size:13px;color:var(--muted)">${t.eff < 75 ? 'This trailer is under-loaded relative to its capacity \u2014 RoutePilot suggests moving a nearby single-cart booking onto this route to lift utilization.' : 'This trailer is running near full efficiency for today\u2019s load.'}</p>
    `);
  }

  /* ---- booking detail modal ---- */
  function openBookingModal(bookingId) {
    const b = D.BOOKINGS.find(x => x.id === bookingId);
    if (!b) return;
    const route = D.ROUTES.find(r => r.stops.some(s => s.id === bookingId));
    const driverName = route ? route.driver.name : 'Unassigned';
    openDetailModal(`Booking ${b.id} \u2014 ${b.customer}`, `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="badge badge-${b.priority.toLowerCase()}">${b.priority}</span>
        <span class="pill pill-blue">Assigned to ${driverName}</span>
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="card card-pad"><div class="stat-label">Address</div><div style="font-family:var(--font-mono);font-size:13.5px;margin-top:6px">${b.address}</div></div>
        <div class="card card-pad"><div class="stat-label">Phone</div><div style="font-family:var(--font-mono);font-size:13.5px;margin-top:6px">${b.phone}</div></div>
        <div class="card card-pad"><div class="stat-label">Delivery Window</div><div style="font-family:var(--font-mono);font-size:13.5px;margin-top:6px">${b.deliveryTime} \u2014 within 1 hr</div></div>
        <div class="card card-pad"><div class="stat-label">Pickup</div><div style="font-family:var(--font-mono);font-size:13.5px;margin-top:6px">${b.pickupTime}</div></div>
        <div class="card card-pad"><div class="stat-label">Golf Carts</div><div style="font-family:var(--font-mono);font-size:13.5px;margin-top:6px">${b.qty}</div></div>
        <div class="card card-pad"><div class="stat-label">Neighborhood</div><div style="font-family:var(--font-mono);font-size:13.5px;margin-top:6px">${b.neighborhood}</div></div>
      </div>
      ${b.notes ? `<div style="margin-top:14px;font-size:13px;color:var(--muted)"><b style="color:var(--ink)">Notes:</b> ${b.notes}</div>` : ''}
    `);
  }
  window.RP_openDriverModal = openDriverModal;
  window.RP_openHubModal = openHubModal;
  window.RP_openBookingModal = openBookingModal;
  window.RP_openDetailModal = openDetailModal;

  /* ============================================================
     TRAILER OPTIMIZER
     ============================================================ */
  function renderTrailerView() {
    const sample = [
      { id: 'Trailer 1', type: 'Double', driver: 'John', carts: 6, eff: 95 },
      { id: 'Trailer 2', type: 'Single', driver: 'Alex', carts: 2, eff: 66 },
      { id: 'Trailer 3', type: 'Double', driver: 'David', carts: 5, eff: 90 },
    ];
    $('#trailerCards').innerHTML = sample.map((t, i) => `
      <div class="card trailer-card hoverable" data-trailer-i="${i}">
        <div class="th"><span class="tname">${t.id}</span><span class="pill ${t.type === 'Double' ? 'pill-blue' : 'pill-emerald'}">${t.type}</span></div>
        <div style="font-size:12.5px;color:var(--muted);margin-top:8px">Driver ${t.driver} \u00b7 ${t.carts} carts loaded</div>
        <div class="eff-bar-track"><div class="eff-bar-fill" style="width:${t.eff}%"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-top:4px"><span>Efficiency</span><span style="font-weight:700;color:var(--navy-dark)">${t.eff}%</span></div>
      </div>
    `).join('');
    $$('[data-trailer-i]').forEach(card => card.addEventListener('click', () => openTrailerModal(sample[+card.dataset.trailerI])));
  }

  /* ============================================================
     CONFLICT DETECTOR
     ============================================================ */
  function renderConflictView() {
    $('#conflictCards').innerHTML = D.CONFLICTS.map(c => `
      <div class="card conflict-card ${c.within ? '' : 'critical'}">
        <div class="ch"><b>${c.within ? 'Potential Conflict' : 'Critical Conflict'}</b>
          <span class="pill ${c.within ? 'pill-emerald' : 'pill-red'}">${c.within ? 'Resolved' : 'Needs Review'}</span></div>
        <div class="conflict-grid">
          <div><span>Customer</span><b>${c.customer}</b></div>
          <div><span>Requested</span><b>${c.requested}</b></div>
          <div><span>Predicted Arrival</span><b>${c.predicted}</b></div>
          <div><span>Within Window?</span><b>${c.within ? 'YES' : 'NO'}</b></div>
        </div>
        <div style="font-size:12.8px;color:var(--muted)">${c.note}</div>
        ${c.suggestions ? `<div class="suggest-chips">${c.suggestions.map(s => `<button class="suggest-chip">${s}</button>`).join('')}</div>` : ''}
      </div>
    `).join('');
    $$('.suggest-chip').forEach(btn => btn.addEventListener('click', () => {
      btn.textContent = '\u2713 Applied';
      btn.style.background = 'var(--emerald)'; btn.style.color = 'white'; btn.style.borderColor = 'var(--emerald)';
      btn.disabled = true;
    }));
  }

  /* ============================================================
     DEADHEAD ANALYSIS
     ============================================================ */
  function renderDeadheadView() {
    $('#deadheadBars').innerHTML = `
      <div class="compare-bar-col"><div class="val">82 mi</div><div class="compare-bar before" style="height:0"></div><div class="lbl">Current Route</div></div>
      <div class="compare-bar-col"><div class="val">58 mi</div><div class="compare-bar after" style="height:0"></div><div class="lbl">Optimized Route</div></div>
    `;
    requestAnimationFrame(() => {
      setTimeout(() => {
        $$('.compare-bar')[0].style.height = '82%';
        $$('.compare-bar')[1].style.height = '58%';
      }, 150);
    });
  }

  /* ============================================================
     HEATMAP
     ============================================================ */
  function renderHeatmapView() {
    const counts = D.NEIGHBORHOODS.map(n => ({ name: n.name, count: D.BOOKINGS.filter(b => b.neighborhood === n.name).length }))
      .sort((a, b) => b.count - a.count);
    const max = Math.max(...counts.map(c => c.count));
    $('#heatmapRows').innerHTML = counts.map(c => `
      <div class="heat-row">
        <div class="name">${c.name}</div>
        <div class="heat-track"><div class="heat-fill" style="width:0%" data-w="${(c.count / max * 100).toFixed(0)}"></div></div>
        <div class="count">${c.count}</div>
      </div>
    `).join('');
    setTimeout(() => $$('.heat-fill').forEach(f => f.style.width = f.dataset.w + '%'), 200);
  }

  /* ============================================================
     AI DISPATCH CHAT
     ============================================================ */
  function initChat() {
    const log = $('#chatLog');
    const input = $('#chatInput');
    const form = $('#chatForm');
    const responses = {
      default: () => `Got it \u2014 I\u2019ve recalculated the affected routes. No customer windows were violated.`,
      cancel: (name) => `Route recalculated. Driver ${D.ROUTES[0].driver.name} now finishes <b>48 minutes earlier</b>.`,
      sick: () => `Redistributing bookings across remaining drivers\u2026 Done. No customer windows violated.`,
      move: () => `Done. Mileage reduced <b>5 miles</b> by moving that driver to a closer hub.`,
    };
    function addMsg(text, from) {
      const el = document.createElement('div');
      el.className = 'msg from-' + from;
      el.innerHTML = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
    }
    function aiReply(text) {
      const typing = document.createElement('div');
      typing.className = 'msg from-ai typing-dots';
      typing.innerHTML = '<span></span><span></span><span></span>';
      log.appendChild(typing);
      log.scrollTop = log.scrollHeight;
      setTimeout(() => {
        typing.remove();
        addMsg(text, 'ai');
      }, 900);
    }
    function handle(text) {
      addMsg(text, 'user');
      const lower = text.toLowerCase();
      let reply = responses.default();
      if (lower.includes('cancel')) reply = responses.cancel();
      else if (lower.includes('sick')) reply = responses.sick();
      else if (lower.includes('move')) reply = responses.move();
      aiReply(reply);
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      input.value = '';
      handle(v);
    });
    $$('.chat-suggestions .sg').forEach(btn => btn.addEventListener('click', () => handle(btn.textContent)));

    // seed initial exchange
    addMsg('Move Driver 3 to Hub A', 'user');
    aiReply('Done. Mileage reduced <b>5 miles</b>.');
    setTimeout(() => {
      addMsg('Customer Smith just cancelled.', 'user');
      aiReply(`Route recalculated. Driver ${D.ROUTES[0].driver.name} now finishes <b>48 minutes earlier</b>.`);
    }, 400);
  }

  /* ============================================================
     PROMPT BUILDER
     ============================================================ */
  function renderPromptBuilder() {
    const vars = ['Hub_A_Drivers', 'Hub_B_Drivers', 'Hub_C_Drivers', 'Bookings', 'Traffic', 'LastMinuteChanges', 'TrailerInventory'];
    $('#varList').innerHTML = vars.map(v => `
      <div class="var-row">
        <span class="vname">{{${v}}}</span>
        <div class="vactions">
          <button class="btn btn-ghost btn-sm" data-copy-var="${v}">Copy</button>
          <button class="btn btn-ghost btn-sm">Edit</button>
        </div>
      </div>
    `).join('');

    const promptText = `<span class="kw">ROLE</span>
You are an expert logistics optimization AI acting as the daily dispatcher
for a golf-cart rental operation running three hubs and ${D.DRIVERS.length} drivers.

<span class="kw">OBJECTIVES</span>
1. Minimize total fleet mileage \u2014 cluster stops by proximity first, not
   strictly by requested time.
2. Honor every customer's one-hour delivery window without exception.
3. Assign Single vs. Double trailers based on total cart load per route.
4. Flag any booking that cannot be met within the promised window instead
   of silently dropping it.
5. Explain each non-obvious decision in plain language.

<span class="kw">INPUT VARIABLES</span>
Hub A drivers:      <span class="var">{{Hub_A_Drivers}}</span>
Hub B drivers:      <span class="var">{{Hub_B_Drivers}}</span>
Hub C drivers:      <span class="var">{{Hub_C_Drivers}}</span>
Trailer inventory:  <span class="var">{{TrailerInventory}}</span>
Today's bookings:   <span class="var">{{Bookings}}</span>
Last-minute changes:<span class="var">{{LastMinuteChanges}}</span>
Traffic notes:      <span class="var">{{Traffic}}</span>

<span class="kw">OUTPUT FORMAT</span>
1. An ordered route per driver with ETA windows inside the 1-hour buffer.
2. Trailer assignment guidance per route.
3. A short conflict summary flagging anything unresolved.
4. A 4-6 sentence executive summary of mileage saved and why.`;
    $('#promptEditor').innerHTML = promptText;

    $$('[data-copy-var]').forEach(btn => btn.addEventListener('click', () => showToast(`Copied {{${btn.dataset.copyVar}}}`)));
    $('#copyPromptBtn').addEventListener('click', () => showToast('Prompt copied \u2014 paste it into ChatGPT or any LLM.'));
  }

  function showToast(text) {
    const toast = $('#copyToast');
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  /* ============================================================
     SAMPLE DATASET
     ============================================================ */
  let datasetSort = { col: 'id', dir: 1 };
  function renderDataset(filter) {
    let rows = D.BOOKINGS.filter(b => !filter || (b.customer + b.address + b.neighborhood).toLowerCase().includes(filter.toLowerCase()));
    const col = datasetSort.col, dir = datasetSort.dir;
    rows = rows.slice().sort((a, b) => {
      let av = a[col], bv = b[col];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
    const shown = rows.slice(0, 60);
    $('#datasetCount').textContent = `${shown.length} of ${rows.length} rows shown (${D.BOOKINGS.length} total)`;
    const arrow = (c) => c === col ? (dir === 1 ? ' \u25B2' : ' \u25BC') : '';
    $('#datasetTable').innerHTML = `
      <table class="data-table">
        <thead><tr>
          <th data-sort="id" class="sortable">ID${arrow('id')}</th>
          <th data-sort="customer" class="sortable">Customer${arrow('customer')}</th>
          <th data-sort="address" class="sortable">Address${arrow('address')}</th>
          <th data-sort="deliveryTime" class="sortable">Delivery${arrow('deliveryTime')}</th>
          <th data-sort="pickupTime" class="sortable">Pickup${arrow('pickupTime')}</th>
          <th data-sort="qty" class="sortable">Qty${arrow('qty')}</th>
          <th data-sort="priority" class="sortable">Priority${arrow('priority')}</th>
        </tr></thead>
        <tbody>
          ${shown.map(b => `<tr class="row-clickable" data-booking-id="${b.id}">
            <td>${b.id}</td><td style="font-family:var(--font-body);font-weight:600">${b.customer}</td>
            <td>${b.address}</td><td>${b.deliveryTime}</td><td>${b.pickupTime}</td><td>${b.qty}</td>
            <td><span class="badge badge-${b.priority.toLowerCase()}">${b.priority}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    $$('#datasetTable tr[data-booking-id]').forEach(tr => tr.addEventListener('click', () => openBookingModal(tr.dataset.bookingId)));
    $$('#datasetTable th.sortable').forEach(th => th.addEventListener('click', () => {
      const c = th.dataset.sort;
      datasetSort.dir = (datasetSort.col === c) ? -datasetSort.dir : 1;
      datasetSort.col = c;
      renderDataset($('#datasetSearch').value);
    }));
  }
  $('#datasetSearch').addEventListener('input', (e) => renderDataset(e.target.value));

  /* ============================================================
     REPORTS (Chart.js)
     ============================================================ */
  let reportsChartInstance = null;
  function renderReports() {
    const datasets = {
      weekly: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        miles: [38, 41, 35, 47, 43, 29, 33],
        fuel: [112, 121, 104, 138, 127, 88, 97],
      },
      monthly: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        miles: [261, 248, 279, 266],
        fuel: [774, 731, 823, 788],
      }
    };
    function draw(range) {
      const d = datasets[range];
      if (reportsChartInstance) reportsChartInstance.destroy();
      reportsChartInstance = new Chart($('#reportsChart').getContext('2d'), {
        type: 'line',
        data: {
          labels: d.labels,
          datasets: [
            { label: 'Miles Saved', data: d.miles, borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.4, fill: true },
            { label: 'Fuel Savings ($)', data: d.fuel, borderColor: '#2E90FA', backgroundColor: 'rgba(46,144,250,0.08)', tension: 0.4, fill: true },
          ]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
      });
    }
    draw('weekly');
    $$('#view-reports .tab-btn').forEach(tab => tab.addEventListener('click', () => {
      $$('#view-reports .tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      draw(tab.textContent.toLowerCase());
    }));

    $('#reportTiles').innerHTML = [
      ['Driver Productivity', '94%', 'up'], ['Trailer Utilization', '91%', 'up'],
      ['Late Deliveries', '0.8%', 'down'], ['Customer Satisfaction', '4.9 / 5', 'up'],
      ['Conflict Frequency', '1.1%', 'down'], ['Avg Dispatch Prep Time', '14 min', 'down'],
    ].map(([l, v, dir]) => `
      <div class="card card-pad">
        <div class="stat-label">${l}</div>
        <div class="stat-value" style="font-size:24px">${v}</div>
        <div class="stat-sub ${dir === 'down' ? '' : ''}">${dir === 'up' ? '\u2191 trending up' : '\u2193 trending down (good)'}</div>
      </div>`).join('');
  }

  /* ============================================================
     MOBILE DRIVER VIEW
     ============================================================ */
  function renderMobileView() {
    const r = D.ROUTES[0];
    const stops = r.stops.slice(0, 5);
    let completedCount = 0;

    function updateProgress() {
      const pct = Math.round((completedCount / stops.length) * 100);
      $('#phoneProgressFill').style.width = pct + '%';
      $('#phoneStopCount').textContent = `${stops.length - completedCount} remaining`;
    }

    $('#phoneStops').innerHTML = stops.map((s, idx) => `
      <div class="phone-stop-card" data-stop-idx="${idx}">
        <div class="row1"><span class="cust">Stop ${idx + 1} \u2014 ${s.customer}</span><span class="eta">${s.deliveryTime}</span></div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">${s.address} \u00b7 ${s.qty} carts</div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-ghost btn-sm" data-nav-stop="${idx}" style="flex:1">Navigate \u2197</button>
          <button class="btn btn-accent btn-sm" data-complete-stop="${idx}" style="flex:1">\u2713 Mark Delivered</button>
        </div>
      </div>
    `).join('');

    $$('[data-complete-stop]').forEach(btn => btn.addEventListener('click', () => {
      const card = btn.closest('.phone-stop-card');
      if (card.classList.contains('done')) return;
      card.classList.add('done');
      btn.textContent = '\u2713 Delivered';
      btn.disabled = true;
      completedCount++;
      updateProgress();
    }));
    $$('[data-nav-stop]').forEach(btn => btn.addEventListener('click', () => showToast('Opening turn-by-turn navigation\u2026')));

    function tickClock() {
      const now = new Date();
      $('#phoneClock').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    tickClock();
    setInterval(tickClock, 30000);
    updateProgress();

    const startBtn = $('#swipeStartBtn');
    let started = false;
    startBtn.addEventListener('click', () => {
      started = !started;
      startBtn.textContent = started ? '\u2713 Route In Progress' : 'START ROUTE \u2192';
    });
  }

  /* ============================================================
     CUSTOMER TIMELINE
     ============================================================ */
  function renderCustomerTimeline() {
    const steps = [
      ['8:00', 'Preparing', true], ['8:25', 'Driver Assigned', true],
      ['8:48', 'Driver En Route', true], ['9:05', 'Delivered', false],
    ];
    $('#custSteps').innerHTML = steps.map((s, i) => `
      <div class="cust-step ${s[2] ? 'done' : (i === 2 ? 'active' : '')}">
        <div class="node">${s[2] ? '\u2713' : '\u25CB'}</div>
        <div><div class="time">${s[0]}</div><div class="lbl">${s[1]}</div></div>
      </div>
    `).join('');
  }

  /* ============================================================
     GLOBAL: recalculate button, exports
     ============================================================ */
  const recalcBtn = $('#recalcBtn');
  if (recalcBtn) recalcBtn.addEventListener('click', () => {
    recalcBtn.textContent = 'Recalculating\u2026';
    recalcBtn.disabled = true;
    setTimeout(() => {
      recalcBtn.textContent = '\u2713 Routes Updated';
      setTimeout(() => { recalcBtn.textContent = 'Recalculate Routes'; recalcBtn.disabled = false; }, 1600);
    }, 1100);
  });

  $$('[data-export]').forEach(btn => btn.addEventListener('click', () => showToast(`Simulating ${btn.dataset.export}\u2026 (no live SMS gateway in this prototype)`)));

  const exportPdfBtn = $('#exportRoutePdfBtn');
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => { showToast('Generating PDF route sheets\u2026'); window.RP_EXPORT.routeSheetsPDF(); });
  const exportCsvBtn = $('#exportRouteCsvBtn');
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => { window.RP_EXPORT.routesCSV(); showToast('CSV downloaded.'); });
  const exportExcelBtn = $('#exportRouteExcelBtn');
  if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => { showToast('Building Excel workbook\u2026'); window.RP_EXPORT.bookingsExcel(); });

  const reportsPdfBtn = $('#reportsPdfBtn');
  if (reportsPdfBtn) reportsPdfBtn.addEventListener('click', () => { showToast('Generating PDF report\u2026'); window.RP_EXPORT.reportsPDF(); });
  const reportsExcelBtn = $('#reportsExcelBtn');
  if (reportsExcelBtn) reportsExcelBtn.addEventListener('click', () => { showToast('Building Excel workbook\u2026'); window.RP_EXPORT.reportsExcel(); });
  const reportsPptxBtn = $('#reportsPptxBtn');
  if (reportsPptxBtn) reportsPptxBtn.addEventListener('click', () => { showToast('Building PowerPoint deck\u2026'); window.RP_EXPORT.reportsPPTX(); });
  const bookingsCsvBtn = $('#bookingsCsvBtn');
  if (bookingsCsvBtn) bookingsCsvBtn.addEventListener('click', () => { window.RP_EXPORT.bookingsCSV(); showToast('CSV downloaded.'); });
  const bookingsExcelBtn = $('#bookingsExcelBtn');
  if (bookingsExcelBtn) bookingsExcelBtn.addEventListener('click', () => { showToast('Building Excel workbook\u2026'); window.RP_EXPORT.bookingsExcel(); });

})();
