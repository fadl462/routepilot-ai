/* ============================================================
   RoutePilot AI — Export Engine
   Generates real, downloadable CSV / Excel / PDF / PowerPoint
   files entirely client-side. No server involved.
   ============================================================ */
(function (global) {
  'use strict';
  const D = global.RP_DATA;

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function toCSV(rows, headers) {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    return [headers.map(esc).join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\r\n');
  }

  /* ---------------- CSV ---------------- */
  function bookingsCSV() {
    const headers = ['id', 'customer', 'address', 'neighborhood', 'phone', 'deliveryTime', 'pickupTime', 'qty', 'priority', 'notes'];
    const csv = toCSV(D.BOOKINGS, headers);
    downloadBlob(new Blob([csv], { type: 'text/csv' }), 'routepilot-bookings.csv');
  }

  function routesCSV() {
    const rows = [];
    D.ROUTES.forEach(r => r.stops.forEach((s, idx) => rows.push({
      driver: r.driver.name, hub: r.hub.id, stopNumber: idx + 1, customer: s.customer,
      address: s.address, phone: s.phone, eta: s.deliveryTime, qty: s.qty, trailer: r.trailer
    })));
    const headers = ['driver', 'hub', 'stopNumber', 'customer', 'address', 'phone', 'eta', 'qty', 'trailer'];
    downloadBlob(new Blob([toCSV(rows, headers)], { type: 'text/csv' }), 'routepilot-todays-routes.csv');
  }

  /* ---------------- EXCEL (.xlsx via SheetJS) ---------------- */
  function bookingsExcel() {
    const wb = XLSX.utils.book_new();
    const bookingsSheet = XLSX.utils.json_to_sheet(D.BOOKINGS.map(b => ({
      ID: b.id, Customer: b.customer, Address: b.address, Neighborhood: b.neighborhood,
      Phone: b.phone, Delivery: b.deliveryTime, Pickup: b.pickupTime, Qty: b.qty, Priority: b.priority, Notes: b.notes
    })));
    XLSX.utils.book_append_sheet(wb, bookingsSheet, 'Bookings');

    const routeRows = [];
    D.ROUTES.forEach(r => r.stops.forEach((s, idx) => routeRows.push({
      Driver: r.driver.name, Hub: r.hub.id, Stop: idx + 1, Customer: s.customer,
      Address: s.address, ETA: s.deliveryTime, Qty: s.qty, Trailer: r.trailer, 'Route Mileage': r.mileage
    })));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(routeRows), 'Routes');

    const driverSheet = XLSX.utils.json_to_sheet(D.DRIVERS.map(d => ({
      Name: d.fullName, Hub: d.hub, Status: d.status, Phone: d.phone, Rating: d.rating,
      'Total Deliveries': d.totalDeliveries, 'On-Time %': d.onTimeRate, 'Safety Score': d.safetyScore
    })));
    XLSX.utils.book_append_sheet(wb, driverSheet, 'Drivers');

    XLSX.writeFile(wb, 'routepilot-fleet-workbook.xlsx');
  }

  function reportsExcel() {
    const wb = XLSX.utils.book_new();
    const weekly = [
      { Day: 'Mon', 'Miles Saved': 38, 'Fuel Savings ($)': 112 }, { Day: 'Tue', 'Miles Saved': 41, 'Fuel Savings ($)': 121 },
      { Day: 'Wed', 'Miles Saved': 35, 'Fuel Savings ($)': 104 }, { Day: 'Thu', 'Miles Saved': 47, 'Fuel Savings ($)': 138 },
      { Day: 'Fri', 'Miles Saved': 43, 'Fuel Savings ($)': 127 }, { Day: 'Sat', 'Miles Saved': 29, 'Fuel Savings ($)': 88 },
      { Day: 'Sun', 'Miles Saved': 33, 'Fuel Savings ($)': 97 },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(weekly), 'Weekly Trend');
    const metrics = [
      { Metric: 'Driver Productivity', Value: '94%' }, { Metric: 'Trailer Utilization', Value: '91%' },
      { Metric: 'Late Deliveries', Value: '0.8%' }, { Metric: 'Customer Satisfaction', Value: '4.9 / 5' },
      { Metric: 'Conflict Frequency', Value: '1.1%' }, { Metric: 'Avg Dispatch Prep Time', Value: '14 min' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metrics), 'Fleet Metrics');
    XLSX.writeFile(wb, 'routepilot-reports.xlsx');
  }

  /* ---------------- PDF (jsPDF + autotable) ---------------- */
  function routeSheetsPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    D.ROUTES.forEach((r, i) => {
      if (i > 0) doc.addPage();
      doc.setFontSize(16); doc.setTextColor(18, 59, 115);
      doc.text('RoutePilot AI \u2014 Driver Route Sheet', 14, 18);
      doc.setFontSize(11); doc.setTextColor(80, 80, 80);
      doc.text(`Driver: ${r.driver.name}   |   Hub: ${r.hub.id}   |   Trailer: ${r.trailer}   |   Mileage: ${r.mileage} mi`, 14, 26);
      doc.autoTable({
        startY: 32,
        head: [['#', 'Customer', 'Address', 'Phone', 'ETA', 'Qty']],
        body: r.stops.map((s, idx) => [idx + 1, s.customer, s.address, s.phone, s.deliveryTime, s.qty]),
        headStyles: { fillColor: [18, 59, 115] },
        styles: { fontSize: 9 },
      });
    });
    doc.save('routepilot-driver-route-sheets.pdf');
  }

  function reportsPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(18, 59, 115);
    doc.text('RoutePilot AI \u2014 Fleet Report', 14, 20);
    doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 27);

    const canvas = document.getElementById('reportsChart');
    if (canvas) {
      try {
        const img = canvas.toDataURL('image/png', 1.0);
        doc.addImage(img, 'PNG', 14, 34, 180, 80);
      } catch (e) { /* canvas not ready — skip image, keep table */ }
    }
    doc.autoTable({
      startY: 120,
      head: [['Metric', 'Value']],
      body: [
        ['Driver Productivity', '94%'], ['Trailer Utilization', '91%'], ['Late Deliveries', '0.8%'],
        ['Customer Satisfaction', '4.9 / 5'], ['Conflict Frequency', '1.1%'], ['Avg Dispatch Prep Time', '14 min'],
      ],
      headStyles: { fillColor: [18, 59, 115] },
    });
    doc.save('routepilot-fleet-report.pdf');
  }

  /* ---------------- PowerPoint (.pptx via PptxGenJS) ---------------- */
  async function reportsPPTX() {
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'RP', width: 10, height: 5.63 });
    pptx.layout = 'RP';

    const title = pptx.addSlide();
    title.background = { color: '0A2647' };
    title.addText('RoutePilot AI', { x: 0.6, y: 1.9, fontSize: 40, bold: true, color: 'FFFFFF', fontFace: 'Arial' });
    title.addText('Fleet Performance Report \u2014 ' + new Date().toLocaleDateString(), { x: 0.6, y: 2.7, fontSize: 16, color: '9FC6FA' });

    const kpi = pptx.addSlide();
    kpi.addText('Today at a Glance', { x: 0.4, y: 0.3, fontSize: 24, bold: true, color: '123B73' });
    const s = D.stats;
    const kpiRows = [
      ['Bookings Today', String(s.bookingsToday)], ['Drivers Active', `${s.driversActive} / ${s.driversTotal}`],
      ['Estimated Mileage', `${s.mileageAfter} mi`], ['Miles Saved', `${s.savingsMiles} mi`],
      ['Fuel Savings', `$${s.fuelSavings}`], ['Optimization Score', `${s.optimizationScore}%`],
    ];
    kpi.addTable(kpiRows, {
      x: 0.4, y: 0.9, w: 9.2, colW: [4.6, 4.6], fontSize: 14, border: { type: 'solid', color: 'E4E7EC' },
      fill: { color: 'F7F9FC' }, color: '101828',
    });

    const canvas = document.getElementById('reportsChart');
    if (canvas) {
      try {
        const img = canvas.toDataURL('image/png', 1.0);
        const chartSlide = pptx.addSlide();
        chartSlide.addText('Weekly Trend', { x: 0.4, y: 0.3, fontSize: 24, bold: true, color: '123B73' });
        chartSlide.addImage({ data: img, x: 0.6, y: 1.0, w: 8.8, h: 4.0 });
      } catch (e) { /* skip chart slide if canvas unavailable */ }
    }

    await pptx.writeFile({ fileName: 'routepilot-fleet-report.pptx' });
  }

  global.RP_EXPORT = { bookingsCSV, routesCSV, bookingsExcel, reportsExcel, routeSheetsPDF, reportsPDF, reportsPPTX };
})(window);
