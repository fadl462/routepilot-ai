/* ============================================================
   RoutePilot AI — Mock Data Layer
   Deterministic pseudo-random generation so the demo is stable
   across reloads but still feels like a "real" day of bookings.
   ============================================================ */

(function (global) {
  'use strict';

  // ---- seeded RNG (mulberry32) so refreshes stay consistent ----
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(19870401);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

  // ---- reference geography (fictional lake-town service area) ----
  const CENTER = { lat: 30.2672, lng: -97.7431 }; // stylised "Lake Travis, TX" area
  const HUBS = [
    { id: 'A', name: 'Hub A — Lakeshore', lat: 30.3935, lng: -97.9089, drivers: 2, single: 1, double: 2, color: '#2E90FA' },
    { id: 'B', name: 'Hub B — Marina District', lat: 30.3072, lng: -97.9203, drivers: 3, single: 2, double: 1, color: '#10B981' },
    { id: 'C', name: 'Hub C — Airport Corridor', lat: 30.1975, lng: -97.6664, drivers: 2, single: 1, double: 2, color: '#F59E0B' },
  ];

  const NEIGHBORHOODS = [
    { name: 'Downtown', lat: 30.2672, lng: -97.7431, weight: 5 },
    { name: 'East Side', lat: 30.2612, lng: -97.7031, weight: 3 },
    { name: 'Airport', lat: 30.1975, lng: -97.6664, weight: 4 },
    { name: 'North Shore', lat: 30.4048, lng: -97.8511, weight: 2 },
    { name: 'Marina District', lat: 30.3072, lng: -97.9203, weight: 4 },
    { name: 'Lakeshore Estates', lat: 30.3935, lng: -97.9089, weight: 3 },
  ];

  const FIRST = ['Smith','Jones','Williams','Brown','Johnson','Davis','Miller','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Garcia','Martinez','Robinson','Clark','Rodriguez','Lewis','Lee','Walker','Hall','Allen','Young','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hernandez'];
  const STREETS = ['Lakeview Dr','Marina Way','Cedar Point Rd','Bluewater Ln','Sunset Cove','Harbor Ridge','Pecan Grove','Shoreline Blvd','Cypress Bend','Regatta Row','Hilltop Ter','Windward Ct','Vista Point','Anchor St','Tanglewood Dr'];

  const DRIVER_NAMES = ['John','Alex','David','Mike','Sarah','Priya','Marcus','Elena'];
  const DRIVER_SURNAMES = ['Alvarado','Chen','Whitfield','Okafor','Nakamura','Singh','Delgado','Petrov'];
  const DRIVER_AVATARS = ['🧑🏽‍✈️','🧑🏻‍✈️','🧑🏿‍✈️','🧑🏼‍✈️','👩🏽‍✈️','👩🏻‍✈️','🧑🏾‍✈️','👩🏿‍✈️'];
  const VEHICLES = ['Ford Transit 250','Chevy Express 3500','Ram ProMaster 2500','Ford F-150 w/ Hitch'];
  const CERTS = [['Trailer Safety I'], ['Trailer Safety I','Trailer Safety II'], ['Trailer Safety I','Defensive Driving'], ['Trailer Safety I','Trailer Safety II','Defensive Driving']];

  function jitter(v, amt) { return v + (rand() - 0.5) * amt; }

  function buildDrivers() {
    const drivers = [];
    let i = 0;
    HUBS.forEach(hub => {
      for (let d = 0; d < hub.drivers; d++) {
        const hireYear = 2019 + randInt(0, 6);
        const tenureYears = 2026 - hireYear;
        drivers.push({
          id: 'D' + (i + 1),
          name: DRIVER_NAMES[i % DRIVER_NAMES.length],
          fullName: `${DRIVER_NAMES[i % DRIVER_NAMES.length]} ${DRIVER_SURNAMES[i % DRIVER_SURNAMES.length]}`,
          avatar: DRIVER_AVATARS[i % DRIVER_AVATARS.length],
          hub: hub.id,
          color: ['#2E90FA', '#10B981', '#F59E0B', '#EF4444', '#7C3AED', '#EC4899', '#06B6D4', '#84CC16'][i % 8],
          status: rand() > 0.85 ? 'On Call' : 'Active',
          phone: `(512) ${randInt(200, 999)}-${String(randInt(0, 9999)).padStart(4, '0')}`,
          email: `${DRIVER_NAMES[i % DRIVER_NAMES.length].toLowerCase()}.${DRIVER_SURNAMES[i % DRIVER_SURNAMES.length].toLowerCase()}@lakesiderentals.com`,
          vehicle: VEHICLES[i % VEHICLES.length],
          plate: `TX-${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(66 + (i % 25))}${randInt(1000, 9999)}`,
          hireDate: `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][randInt(0,11)]} ${hireYear}`,
          tenureYears,
          rating: (4.5 + rand() * 0.5).toFixed(1),
          totalDeliveries: randInt(1200, 6400) + tenureYears * 400,
          safetyScore: randInt(92, 100),
          onTimeRate: (95 + rand() * 4.5).toFixed(1),
          certifications: CERTS[i % CERTS.length],
          preferredTrailer: rand() > 0.5 ? 'Double' : 'Single',
        });
        i++;
      }
    });
    return drivers;
  }

  function buildTrailers() {
    const trailers = [];
    let tid = 1;
    HUBS.forEach(hub => {
      for (let s = 0; s < hub.single; s++) trailers.push({ id: 'T' + tid++, hub: hub.id, type: 'Single', capacity: 2 });
      for (let d2 = 0; d2 < hub.double; d2++) trailers.push({ id: 'T' + tid++, hub: hub.id, type: 'Double', capacity: 6 });
    });
    return trailers;
  }

  function buildBookings(count) {
    const bookings = [];
    for (let n = 1; n <= count; n++) {
      const nb = pick(NEIGHBORHOODS.filter(x => rand() * 6 < x.weight || true));
      const hour = randInt(7, 15);
      const min = pick([0, 15, 30, 45]);
      const dur = pick([1, 2, 3, 4]);
      const qty = pick([1, 1, 2, 2, 2, 3, 4, 6]);
      const priorityRoll = rand();
      bookings.push({
        id: 'B' + String(n).padStart(3, '0'),
        customer: pick(FIRST),
        address: `${randInt(100, 9999)} ${pick(STREETS)}`,
        neighborhood: nb.name,
        lat: jitter(nb.lat, 0.045),
        lng: jitter(nb.lng, 0.045),
        phone: `(512) ${randInt(200, 999)}-${String(randInt(0, 9999)).padStart(4, '0')}`,
        deliveryTime: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        pickupTime: `${String(Math.min(hour + dur, 20)).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        qty,
        priority: priorityRoll > 0.94 ? 'VIP' : (priorityRoll > 0.85 ? 'Recurring' : 'Standard'),
        notes: pick(['', '', '', 'Gate code 4471', 'Call on arrival', 'Leave at dock', 'Repeat customer', '']),
      });
    }
    return bookings;
  }

  const DRIVERS = buildDrivers();
  const TRAILERS = buildTrailers();
  const BOOKINGS = buildBookings(186);

  const TODAYS_CHANGES = [
    { type: 'cancelled', label: 'Customer cancelled', detail: 'Booking #B142 — Harris, East Side', icon: '✕' },
    { type: 'address', label: 'Address changed', detail: 'Booking #B067 — Nguyen, Marina District', icon: '⌂' },
    { type: 'driver', label: 'Driver unavailable', detail: 'Mike (D8) called in sick', icon: '⚠' },
    { type: 'trailer', label: 'Trailer damaged', detail: 'T4 — Double, Hub B, out of service', icon: '⛟' },
    { type: 'emergency', label: 'Emergency booking', detail: 'VIP request — same-day delivery, Downtown', icon: '★' },
  ];

  // ---- Route assignment: cluster bookings by nearest hub + neighborhood, then
  // split across that hub's drivers to build a believable per-driver timeline ----
  function haversine(a, b) {
    const R = 3958.8;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  function buildOptimizedPlan() {
    // assign each booking to nearest hub
    const byHub = {};
    HUBS.forEach(h => byHub[h.id] = []);
    BOOKINGS.forEach(b => {
      let best = HUBS[0], bestD = Infinity;
      HUBS.forEach(h => { const d = haversine(h, b); if (d < bestD) { bestD = d; best = h; } });
      byHub[best.id].push({ ...b, hub: best.id, dist: bestD });
    });

    const driverRoutes = [];
    HUBS.forEach(hub => {
      const hubDrivers = DRIVERS.filter(d => d.hub === hub.id);
      const hubBookings = byHub[hub.id].sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime));
      // round-robin-ish clustering: split sorted-by-time list into N chunks per driver, biased by proximity
      const chunks = hubDrivers.map(() => []);
      hubBookings.forEach((b, idx) => chunks[idx % hubDrivers.length].push(b));

      hubDrivers.forEach((driver, idx) => {
        const stops = chunks[idx].sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime));
        let mileage = 0;
        let cursor = hub;
        stops.forEach(s => { mileage += haversine(cursor, s); cursor = s; });
        mileage += haversine(cursor, hub); // return to hub
        const totalCarts = stops.reduce((sum, s) => sum + s.qty, 0);
        const trailer = totalCarts > 4 ? 'Double Trailer' : (totalCarts > 0 ? 'Single Trailer' : '—');
        driverRoutes.push({
          driver,
          hub,
          stops,
          mileage: Math.round(mileage * 10) / 10,
          totalCarts,
          trailer,
          utilization: Math.min(99, Math.round(60 + rand() * 38)),
        });
      });
    });
    return driverRoutes;
  }

  const ROUTES = buildOptimizedPlan();

  const CONFLICTS = [
    { customer: 'Johnson', requested: '9:00', predicted: '9:40', within: true, note: 'Within one-hour window — no action required.' },
    { customer: 'Brown', requested: '9:00', predicted: '10:38', within: false, note: 'Outside commitment window — needs dispatcher review.', suggestions: ['Move to Driver 3', 'Swap Pickup', 'Delay Pickup', 'Call Customer'] },
    { customer: 'Alvarez', requested: '11:15', predicted: '11:52', within: true, note: 'Within one-hour window — no action required.' },
  ];

  global.RP_DATA = {
    HUBS, DRIVERS, TRAILERS, BOOKINGS, ROUTES, CONFLICTS, TODAYS_CHANGES, NEIGHBORHOODS, CENTER,
    stats: {
      bookingsToday: BOOKINGS.length,
      driversActive: DRIVERS.filter(d => d.status === 'Active').length,
      driversTotal: DRIVERS.length,
      cartsScheduled: BOOKINGS.reduce((s, b) => s + b.qty, 0),
      mileageBefore: 214,
      mileageAfter: 171,
      savingsMiles: 43,
      fuelSavings: 127,
      optimizationScore: 96,
      onTimePrediction: 99.2,
    }
  };
})(window);
