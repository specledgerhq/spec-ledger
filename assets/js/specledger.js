/* SpecLedger
 * Lightweight, dependency-free JS for:
 * - compare index page
 * - single phone template page
 * Data format:
 * {
 *   "items": [ { id, brand, model, ... } ]
 * }
 */

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

function text(v) {
  return (v ?? "").toString().toLowerCase();
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function uniq(arr) {
  return [...new Set(arr)].filter(Boolean);
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  children.forEach(c =>
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c)
  );
  return n;
}

/* ---------- DATA LOADING ---------- */

async function loadPhones() {
  const paths = [
    "/spec-ledger/data/phones.json",
    "/spec-ledger/data/phones.example.json",
    "/data/phones.json",
    "/data/phones.example.json"
  ];

  for (const p of paths) {
    try {
      const data = await fetchJSON(p);
      if (data?.items) return data.items;
    } catch (_) {}
  }

  throw new Error("No phone dataset found");
}

/* ---------- COMPARE INDEX ---------- */

function renderCompare(items) {
  const q = document.getElementById("q");
  const brand = document.getElementById("brand");
  const count = document.getElementById("count");
  const grid = document.getElementById("grid");

  const brands = uniq(items.map(i => i.brand)).sort();
  brand.innerHTML = `<option value="">All brands</option>`;
  brands.forEach(b =>
    brand.appendChild(el("option", { value: b }, [b]))
  );

  function matches(i) {
    if (brand.value && i.brand !== brand.value) return false;
    const query = text(q.value);
    if (!query) return true;

    return text(
      `${i.brand} ${i.model} ${i.id} ${i?.chipset?.name}`
    ).includes(query);
  }

  function card(i) {
    const name = `${i.brand} ${i.model}`.trim();
    return el("a", {
      class: "card",
      href: `./phone.html?id=${encodeURIComponent(i.id)}`
    }, [
      el("div", { class: "title" }, [
        el("h2", {}, [name]),
        el("span", { class: "badge" }, [i.brand])
      ]),
      el("div", { class: "kv" }, [
        el("div", {}, [el("b", {}, ["Release: "]), formatDate(i.release_date)]),
        el("div", {}, [el("b", {}, ["Display: "]), i?.display?.size_in ? `${i.display.size_in}"` : "—"]),
        el("div", {}, [el("b", {}, ["Chipset: "]), i?.chipset?.name ?? "—"]),
        el("div", {}, [el("b", {}, ["Battery: "]), i?.battery?.mah ? `${i.battery.mah} mAh` : "—"])
      ])
    ]);
  }

  function repaint() {
    const filtered = items.filter(matches);
    count.textContent = `${filtered.length} phones`;
    grid.innerHTML = "";
    filtered.forEach(i => grid.appendChild(card(i)));
  }

  q.addEventListener("input", repaint);
  brand.addEventListener("change", repaint);
  repaint();
}

/* ---------- PHONE PAGE ---------- */

function renderPhone(item) {
  document.getElementById("phone-name").textContent =
    `${item.brand} ${item.model}`;
  document.getElementById("phone-sub").textContent =
    `Release: ${formatDate(item.release_date)} • ID: ${item.id}`;

  const pills = document.getElementById("pills");
  pills.innerHTML = "";
  [
    item?.os?.name,
    item?.chipset?.name,
    item?.display?.type,
    item?.waterproof?.rating
  ].filter(Boolean).forEach(p =>
    pills.appendChild(el("span", { class: "pill" }, [p]))
  );

  const specs = document.getElementById("specs");
  specs.innerHTML = "";

  function block(title, rows) {
    const dl = el("dl");
    rows.forEach(([k, v]) => {
      dl.appendChild(el("dt", {}, [k]));
      dl.appendChild(el("dd", {}, [v ?? "—"]));
    });
    specs.appendChild(el("section", { class: "spec" }, [
      el("h3", {}, [title]),
      dl
    ]));
  }

  block("Core", [
    ["Brand", item.brand],
    ["Model", item.model],
    ["OS", item?.os?.name],
    ["Release", formatDate(item.release_date)]
  ]);

  block("Display", [
    ["Size", item?.display?.size_in ? `${item.display.size_in}"` : "—"],
    ["Type", item?.display?.type],
    ["Resolution", item?.display?.resolution],
    ["Refresh", item?.display?.refresh_hz ? `${item.display.refresh_hz} Hz` : "—"]
  ]);

  block("Performance", [
    ["Chipset", item?.chipset?.name],
    ["RAM", item?.memory?.ram_gb ? `${item.memory.ram_gb} GB` : "—"],
    ["Storage", item?.storage?.gb ? `${item.storage.gb} GB` : "—"],
    ["5G", item?.connectivity?.five_g ? "Yes" : "—"]
  ]);

  block("Battery", [
    ["Capacity", item?.battery?.mah ? `${item.battery.mah} mAh` : "—"],
    ["Wired", item?.charging?.wired_w ? `${item.charging.wired_w} W` : "—"],
    ["Wireless", item?.charging?.wireless_w ? `${item.charging.wireless_w} W` : "—"]
  ]);

  const src = document.getElementById("sources");
  src.innerHTML = "";
  (item.source_urls ?? []).forEach(u =>
    src.appendChild(el("li", {}, [
      el("a", { href: u, target: "_blank", rel: "nofollow noopener" }, [u])
    ]))
  );

  document.getElementById("jsonld").textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${item.brand} ${item.model}`,
    "brand": { "@type": "Brand", "name": item.brand },
    "model": item.model,
    "releaseDate": item.release_date,
    "description": item.description ?? ""
  });
}

/* ---------- BOOT ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const items = await loadPhones();
    const page = document.documentElement.dataset.page;

    if (page === "compare-index") {
      renderCompare(items);
    }

    if (page === "phone") {
      const id = new URLSearchParams(location.search).get("id");
      const item = items.find(i => i.id === id);
      if (!item) {
        document.getElementById("notfound").hidden = false;
        document.getElementById("found").hidden = true;
      } else {
        renderPhone(item);
      }
    }
  } catch (e) {
    console.error(e);
    const err = document.getElementById("load-error");
    if (err) {
      err.hidden = false;
      err.textContent =
        "Failed to load data. Ensure data/phones.json exists.";
    }
  }
});
