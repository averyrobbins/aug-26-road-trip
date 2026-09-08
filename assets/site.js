/* Public-data-only reader. No fetch, storage, telemetry, or external resources. */
(() => {
  "use strict";
  const D = window.ROAD_TRIP_DATA;
  const $ = id => document.getElementById(id);
  const n = value => value === null || value === undefined || value === "" ? null : Number(value);
  const money = value => n(value) === null || !Number.isFinite(n(value)) ? "Not known" : n(value).toLocaleString("en-US", {style: "currency", currency: "USD"});
  const fixed = (value, digits = 3) => n(value) === null || !Number.isFinite(n(value)) ? "Not known" : n(value).toLocaleString("en-US", {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const categoryLabels = {snacks_drinks: "Convenience snacks", household_supplies: "Household supplies", unallocated: "Unallocated correction"};
  const pretty = value => categoryLabels[value] || (value ? String(value).replaceAll("_", " ").replace(/^./, x => x.toUpperCase()) : "Unknown");
  const day = (value, long = false) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {month: long ? "long" : "short", day: "numeric", ...(long ? {year: "numeric"} : {})}) : "Date unknown";
  const element = (tag, text, className) => {const node = document.createElement(tag); if (text !== null && text !== undefined) node.textContent = text; if (className) node.className = className; return node;};
  const append = (parent, ...children) => {children.forEach(child => parent.append(child)); return parent;};
  const svgElement = (tag, attrs = {}) => {const node = document.createElementNS("http://www.w3.org/2000/svg", tag); Object.entries(attrs).forEach(([key, val]) => node.setAttribute(key, val)); return node;};
  const total = rows => rows.reduce((sum, row) => sum + (n(row.total) || 0), 0);
  const sortedTotal = rows => [...rows].sort((a, b) => n(b.total) - n(a.total));
  function table(target, rows, columns, caption) {
    const wrapper = element("div", null, "data-table-wrapper"), t = element("table", null, "data-table");
    if (caption) t.append(element("caption", caption));
    const head = element("tr");
    columns.forEach(col => {const cell = element("th", col.label, col.numeric ? "numeric" : ""); cell.scope = "col"; head.append(cell);});
    t.append(append(element("thead"), head));
    const body = element("tbody");
    rows.forEach(row => {const tr = element("tr"); columns.forEach(col => tr.append(element("td", col.format ? col.format(row[col.key], row) : row[col.key] ?? "Unknown", col.numeric ? "numeric" : ""))); body.append(tr);});
    t.append(body); wrapper.append(t); $(target).replaceChildren(wrapper);
  }
  function metric(target, label, value, note, primary = false) {
    const block = element("div", null, `metric${primary ? " metric-primary" : ""}`);
    append(block, element("p", label, "metric-label"), element("span", value, "metric-value"), element("p", note, "metric-note")); $(target).append(block);
  }
  const amountColumn = {key: "total", label: "Amount", numeric: true, format: money};
  try {
    if (!D?.report?.summary?.length || !Array.isArray(D.map?.purchases)) throw new Error("Missing public trip data");
    const R = D.report, S = R.summary[0], F = R.fuel_summary[0] || {}, purchases = D.map.purchases;
    const from = new Date(`${D.start_date}T12:00:00`);
    $("edition").textContent = `${from.toLocaleDateString("en-US", {month: "long"})} ’${String(from.getFullYear()).slice(-2)}`;
    document.title = `${$("edition").textContent} / Road trip`;
    $("trip-period").textContent = `${day(D.start_date)} — ${day(D.end_date, true)}`;
    metric("headline-metrics", "Recorded trip spending", money(S.total), `${S.transactions} included payments · not a complete trip budget`, true);
    metric("headline-metrics", "Fuel", money(F.total), F.posted_price_purchases !== undefined ? `${F.purchases} fuel payments · ${F.quantified_purchases} with volume · ${F.posted_price_purchases} with posted prices` : F.unquantified_purchases ? `${F.purchases} fuel payments · ${F.quantified_purchases} with gallon/price details; ${money(F.unquantified_total)} without` : `${F.purchases} purchases · ${fixed(F.gallons)} gallons`);
    metric("headline-metrics", "Food", money(R.food_summary[0]?.total), "Restaurants, groceries & convenience snacks");
    metric("headline-metrics", "Dated receipt spending", money(S.dated_receipt_total), `${S.dated_transactions} payments with complete trip dates`);
    const provisional = R.scope.find(row => row.scope === "undated_provisional"), manual = R.scope.find(row => row.scope === "manual_addition"), excluded = R.scope.find(row => row.scope === "outside_trip_dates");
    const coverage = `Included: ${money(S.receipt_total)} in receipts plus ${money(S.manual_total)} in user-reported payments. ${provisional?.transactions ?? "Some"} undated receipts (${money(S.undated_receipt_total)}) are provisional; ${money(S.estimated_total)} of the manual spending is estimated.`;
    $("coverage-note").textContent = coverage;
    $("method-coverage").textContent = `${coverage} ${excluded?.transactions ?? 0} outside-window receipts (${money(excluded?.total ?? 0)}) are excluded. ${manual?.transactions ?? 0} manual payments have no receipt images or itemization.`;
    const lodgingPresent = R.categories.some(row => ["lodging", "accommodation", "accommodations", "hotel", "hotels"].includes(String(row.category).toLowerCase()));
    const overrides = purchases.filter(row => row.amount_is_user_override);
    if (overrides.length) {
      const delta = overrides.reduce((sum, row) => sum + n(row.correction_amount), 0);
      const fuelDelta = overrides.filter(row => row.correction_category === "fuel").reduce((sum, row) => sum + n(row.correction_amount), 0);
      $("correction-note").hidden = false;
      $("correction-note").textContent = `Includes ${money(delta)} in user-confirmed corrections. The Green River, Wyoming Maverik payment is recorded at $53.37 instead of the original $3.37. ` + (fuelDelta ? `The additional ${money(fuelDelta)} is allocated to Fuel. Its gallons and unit price are unknown. The effective price average uses ${F.quantified_purchases} purchases with volume (${money(F.quantified_total)} and ${fixed(F.gallons)} gallons); posted-price comparisons use ${F.posted_price_purchases ?? F.quantified_purchases} purchases. Original itemization and printed tax are preserved; checkout-bag charges are grouped into Groceries.` : `The correction remains unallocated; known food, tax, and fuel amounts are unchanged.`);
    }
    $("method-evidence").textContent = "Receipt totals are counted once. Category tax splits are approximations, not separately printed category-level taxes. Unknown dates and prices stay unknown. " + (lodgingPresent ? "Available expenses are not proof that every trip cost is captured." : "The current categories contain no lodging evidence, so this should not be read as the entire cost of the trip.");
    if (F.posted_price_purchases !== undefined) $("method-evidence").textContent += " Ten additional images add eight payments ($317.64); two support existing purchases without double-counting. The Creamery link is a merchant-and-amount assumption. Bank dates are transaction dates; pump-photo dates approximate purchase dates. Bank tax/tip splits and pump grades/posted prices are not invented. DoorDash is assigned to Utah by owner confirmation; its city and map point are unknown.";
    table("category-table", sortedTotal(R.categories), [{key: "category", label: "Category", format: pretty}, amountColumn, {label: "Share", numeric: true, format: (_, row) => `${(n(row.total) / n(S.total) * 100).toFixed(1)}%`}]);
    table("food-table", sortedTotal(R.food), [{key: "category", label: "Food category", format: pretty}, amountColumn]);
    $("food-share").textContent = `${(n(R.food_summary[0]?.total) / n(S.total) * 100).toFixed(1)}% of recorded spending`;
    const peak = sortedTotal(R.daily.filter(row => row.day))[0];
    if (peak) append($("peak-day"), element("p", "Highest-spending dated day", "small-label"), append(element("p"), element("strong", `${day(peak.day)} · ${money(peak.total)}`)), element("p", `${peak.transactions} payments. Undated and manual additions are not assigned to a day.`));
    const stateNames = Object.fromEntries((D.map.states?.features || []).map(feature => [feature.properties.STUSPS, feature.properties.NAME]));
    const stateName = value => stateNames[value] || value || "Unknown state";
    initializeMap(purchases, D.map.states, stateName);
  } catch (error) {
    $("data-error").hidden = false;
    console.error("Road trip view could not initialize:", error.message);
  }

  function initializeMap(purchases, states, stateName) {
    const svg = $("purchase-map"), pointsGroup = $("map-points"), stateGroup = $("map-states"), labelGroup = $("map-state-labels");
    const mapped = row => Number.isFinite(n(row.latitude)) && Number.isFinite(n(row.longitude)) && n(row.latitude) !== null && n(row.longitude) !== null;
    const coordinates = purchases.filter(mapped);
    const minLon = coordinates.length ? Math.min(...coordinates.map(row => n(row.longitude))) - 2.7 : -114;
    const maxLon = coordinates.length ? Math.max(...coordinates.map(row => n(row.longitude))) + 2.7 : -82;
    const minLat = coordinates.length ? Math.min(...coordinates.map(row => n(row.latitude))) - 2 : 33;
    const maxLat = coordinates.length ? Math.max(...coordinates.map(row => n(row.latitude))) + 2 : 43;
    const cos = Math.cos((minLat + maxLat) / 2 * Math.PI / 180), scale = Math.min(900 / ((maxLon - minLon) * cos), 430 / (maxLat - minLat));
    const centerLon = (minLon + maxLon) / 2, centerLat = (minLat + maxLat) / 2;
    const project = ([lon, lat]) => [500 + (lon - centerLon) * cos * scale, 260 - (lat - centerLat) * scale];
    const view = {x: 0, y: 0, width: 1000, height: 520};
    const pointNodes = new Map(), stateNodes = new Map(), labelNodes = []; let selected = null, visible = [];
    function sizeMapMarks() {
      // Counter the SVG viewBox scale so geographic positions stay unchanged
      // while markers and label glyphs remain legible in CSS screen pixels.
      const matrix = svg.getScreenCTM?.(), rect = svg.getBoundingClientRect();
      const pixelsPerUnit = matrix ? Math.hypot(matrix.a, matrix.b) : Math.min(rect.width / view.width, rect.height / view.height);
      if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) return;
      pointNodes.forEach(point => point.setAttribute("r", 5 / pixelsPerUnit));
      labelNodes.forEach(label => {label.setAttribute("font-size", 11 / pixelsPerUnit); label.setAttribute("letter-spacing", 0.65 / pixelsPerUnit);});
    }
    function setView() {svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.width} ${view.height}`); $("zoom-in").disabled = view.width <= 110; $("zoom-out").disabled = view.width >= 1800; sizeMapMarks();}
    function zoom(factor) {const width = Math.max(110, Math.min(1800, view.width * factor)), ratio = width / view.width; view.x += view.width * (1 - ratio) / 2; view.y += view.height * (1 - ratio) / 2; view.width = width; view.height = width * 0.52; setView();}
    function pan(dx, dy) {view.x += dx * view.width; view.y += dy * view.height; setView();}
    function reset() {Object.assign(view, {x: 0, y: 0, width: 1000, height: 520}); setView();}
    function geometryPath(geometry) {
      const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
      return polygons.map(polygon => polygon.map(ring => ring.map((point, index) => {const [x, y] = project(point); return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;}).join(" ") + " Z").join(" ")).join(" ");
    }
    (states?.features || []).filter(feature => !["AK", "HI", "PR", "GU", "VI", "AS", "MP"].includes(feature.properties.STUSPS)).forEach(feature => {
      const props = feature.properties, code = props.STUSPS;
      const path = svgElement("path", {d: geometryPath(feature.geometry), class: "state-shape", "fill-rule": "evenodd", "aria-label": props.NAME});
      path.append(append(svgElement("title"), document.createTextNode(props.NAME)));
      path.addEventListener("click", () => {if (!purchases.some(row => row.state === code)) return; $("filter-state").value = $("filter-state").value === code ? "" : code; applyFilters();});
      stateGroup.append(path); stateNodes.set(code, path);
      if (n(props.INTPTLON) !== null && n(props.INTPTLAT) !== null) {const [x, y] = project([n(props.INTPTLON), n(props.INTPTLAT)]); const label = svgElement("text", {x, y, class: "state-label"}), glyphs = svgElement("tspan"); glyphs.textContent = code; label.append(glyphs); labelNodes.push(glyphs); labelGroup.append(label);}
    });
    coordinates.forEach(row => {
      const [cx, cy] = project([n(row.longitude), n(row.latitude)]), point = svgElement("circle", {cx, cy, r: 6.5, class: "purchase-point", tabindex: "0", role: "button", "aria-label": `${row.merchant}, ${[row.city, row.state].filter(Boolean).join(", ")}, ${day(row.purchase_date)}, ${money(row.total)}`});
      point.append(append(svgElement("title"), document.createTextNode(`${row.merchant} · ${money(row.total)} · ${day(row.purchase_date)}`)));
      point.addEventListener("click", () => select(row.id));
      point.addEventListener("keydown", event => {if (["Enter", " "].includes(event.key)) {event.preventDefault(); select(row.id);}});
      pointsGroup.append(point); pointNodes.set(row.id, point);
    });
    const option = (value, label) => {const node = element("option", label); node.value = value; return node;};
    [...new Set(purchases.map(row => row.state || "unknown"))].sort((a, b) => stateName(a).localeCompare(stateName(b))).forEach(value => $("filter-state").append(option(value, value === "unknown" ? "Unknown state" : stateName(value))));
    [...new Set(purchases.map(row => row.primary_category || "unknown"))].sort().forEach(value => $("filter-category").append(option(value, pretty(value))));
    [...new Set(purchases.map(row => row.purchase_date).filter(Boolean))].sort().forEach(value => $("filter-date").append(option(value, day(value))));
    if (purchases.some(row => !row.purchase_date)) $("filter-date").append(option("unknown", "Date unknown"));
    function chronology(a, b) {if (!a.purchase_date && b.purchase_date) return 1; if (a.purchase_date && !b.purchase_date) return -1; return (a.purchase_date || "").localeCompare(b.purchase_date || "") || n(a.total) - n(b.total) || a.id.localeCompare(b.id);}
    function applyFilters() {
      const state = $("filter-state").value, category = $("filter-category").value, date = $("filter-date").value, location = $("filter-location").value;
      visible = purchases.filter(row => (!state || (row.state || "unknown") === state) && (!category || (row.primary_category || "unknown") === category) && (!date || (row.purchase_date || "unknown") === date) && (!location || mapped(row) === (location === "mapped")));
      const mode = $("list-order").value;
      visible.sort(mode === "date" ? chronology : (a, b) => (n(a.total) - n(b.total)) * (mode === "amount-desc" ? -1 : 1) || chronology(a, b));
      const ids = new Set(visible.map(row => row.id));
      pointNodes.forEach((point, id) => {const show = ids.has(id); point.classList.toggle("is-dimmed", !show); point.setAttribute("tabindex", show ? "0" : "-1"); point.setAttribute("aria-hidden", String(!show));});
      stateNodes.forEach((path, code) => path.classList.toggle("is-active", code === state));
      if (selected && !ids.has(selected)) select(null);
      renderList();
      const onMap = visible.filter(mapped).length;
      const fuelPortion = visible.reduce((sum, row) => sum + (row.fuel_amount ?? 0), 0);
      $("map-results-status").textContent = `${visible.length} ${visible.length === 1 ? "payment" : "payments"} · ${money(total(visible))} in whole payments${fuelPortion ? ` · ${money(fuelPortion)} fuel portion` : ""} · ${onMap} mapped, ${visible.length - onMap} without a map location`;
    }
    function renderList() {
      const list = $("purchase-list"); list.replaceChildren();
      if (!visible.length) {list.append(element("p", "No purchases match these filters. Clear a filter to see more.", "empty-message")); return;}
      visible.forEach(row => {
        const card = element("button", null, "purchase-card"); card.type = "button"; card.dataset.purchase = row.id; card.classList.toggle("is-selected", selected === row.id); card.setAttribute("aria-pressed", String(selected === row.id));
        append(card, append(element("span", null, "purchase-card-top"), element("span", row.merchant), element("span", money(row.total))), element("span", [row.city, row.state ? stateName(row.state) : null].filter(Boolean).join(", ") || "Location not supplied", "purchase-card-place"), element("span", `${day(row.purchase_date)} · ${pretty(row.primary_category)}${mapped(row) ? " · Approximate location" : " · Unmapped"}${row.amount_is_estimated ? " · Estimated" : ""}${row.amount_is_user_override ? " · User-confirmed override" : ""}`, "purchase-card-meta"));
        card.addEventListener("click", () => select(row.id)); list.append(card);
      });
    }
    function select(id) {
      selected = id; pointNodes.forEach((point, key) => {point.classList.toggle("is-selected", key === id); point.setAttribute("aria-pressed", String(key === id));});
      const row = purchases.find(candidate => candidate.id === id), content = $("purchase-detail-content"); content.replaceChildren();
      if (!row) {$("purchase-detail-heading").textContent = "Choose a stop"; content.append(element("p", "Select a map point or a purchase in the list to see its details."));}
      else {
        $("purchase-detail-heading").textContent = row.merchant; content.append(element("p", money(row.total), "detail-amount"));
        const facts = element("dl", null, "detail-facts");
        const fact = (label, value) => facts.append(append(element("div"), element("dt", label), element("dd", value)));
        fact("Date", day(row.purchase_date, true)); fact("Place", [row.city, row.state ? stateName(row.state) : null].filter(Boolean).join(", ") || "Not supplied"); fact("Primary purchase type", pretty(row.primary_category)); fact("Location precision", mapped(row) ? "Approximate · rounded coordinates" : "No map location");
        if (row.fuel_gallons !== null && row.fuel_gallons !== undefined) {fact("Fuel quantity", `${fixed(row.fuel_gallons)} gallons`); fact("Posted fuel price", row.fuel_unit_price == null ? "Not captured" : `$${fixed(row.fuel_unit_price)}/gallon`); fact("Effective paid price", `$${fixed(row.fuel_amount / row.fuel_gallons)}/gallon (derived)`); fact("Printed fuel grade", row.fuel_grade || "Not captured");}
        content.append(facts);
        if (row.is_manual) content.append(element("p", "User-reported payment. No receipt image or itemization was supplied.", "detail-warning"));
        if (row.amount_is_estimated) content.append(element("p", "This payment amount is an estimate.", "detail-warning"));
        if (row.amount_is_user_override) content.append(element("p", `User-confirmed total override: ${money(row.original_extracted_total)} → ${money(row.total)}. The ${money(row.correction_amount)} increase is ` + (row.correction_category === "fuel" ? "allocated to Fuel by the owner. Gallons, unit price, and grade are unknown; this amount is excluded from fuel-price averages." : "unallocated, with no supplied purchase category.") + ` Original itemization and tax still add to ${money(row.original_extracted_total)}.`, "detail-warning"));
        if (!row.purchase_date) content.append(element("p", "Complete purchase date unknown. It has not been assigned to a trip day.", "detail-warning"));
        const point = pointNodes.get(id); if (point) pointsGroup.append(point);
      }
      document.querySelectorAll(".purchase-card").forEach(card => {const chosen = card.dataset.purchase === id; card.classList.toggle("is-selected", chosen); card.setAttribute("aria-pressed", String(chosen));});
    }
    $("map-filters").addEventListener("submit", event => event.preventDefault());
    ["filter-state", "filter-category", "filter-date", "filter-location", "list-order"].forEach(id => $(id).addEventListener("change", applyFilters));
    $("clear-filters").addEventListener("click", () => {$("map-filters").reset(); applyFilters();});
    $("zoom-in").addEventListener("click", () => zoom(0.8)); $("zoom-out").addEventListener("click", () => zoom(1.25)); $("reset-map").addEventListener("click", reset);
    $("pan-left").addEventListener("click", () => pan(-0.1, 0)); $("pan-right").addEventListener("click", () => pan(0.1, 0)); $("pan-up").addEventListener("click", () => pan(0, -0.1)); $("pan-down").addEventListener("click", () => pan(0, 0.1));
    svg.addEventListener("keydown", event => {if (event.target !== svg) return; const moves = {ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1]}; if (moves[event.key]) {event.preventDefault(); pan(...moves[event.key]);} else if (["+", "=", "-", "_", "Home"].includes(event.key)) {event.preventDefault(); if (event.key === "Home") reset(); else zoom(["+", "="].includes(event.key) ? 0.8 : 1.25);}});
    let drag = null, suppressClickUntil = 0;
    svg.addEventListener("click", event => {if (performance.now() < suppressClickUntil) {event.preventDefault(); event.stopPropagation();}}, true);
    svg.addEventListener("pointerdown", event => {if (event.target.closest(".purchase-point") || event.button !== 0) return; drag = {x: event.clientX, y: event.clientY, startX: view.x, startY: view.y, moved: false};});
    svg.addEventListener("pointermove", event => {if (!drag) return; const rect = svg.getBoundingClientRect(), scalePx = Math.min(rect.width / view.width, rect.height / view.height); const dx = event.clientX - drag.x, dy = event.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 5) {drag.moved = true; svg.setPointerCapture(event.pointerId); svg.classList.add("is-dragging");} if (!drag.moved) return; view.x = drag.startX - dx / scalePx; view.y = drag.startY - dy / scalePx; setView();});
    svg.addEventListener("pointerup", event => {if (drag?.moved) suppressClickUntil = performance.now() + 200; drag = null; svg.classList.remove("is-dragging"); if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);});
    svg.addEventListener("pointercancel", () => {drag = null; svg.classList.remove("is-dragging");});
    if (typeof window.ResizeObserver === "function") new window.ResizeObserver(sizeMapMarks).observe(svg);
    else window.addEventListener("resize", sizeMapMarks);
    applyFilters(); setView();
  }
})();
