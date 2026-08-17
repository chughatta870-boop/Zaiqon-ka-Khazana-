/* ذائقوں کا خزانہ — app logic
   M Ijaz · GHS 124/NB */

const CAT_ORDER = ["all","favorites","pakora","samosa","chips","kabab","roll","burger","chaat","pizza","shawarma","rice"];
const CAT_META = {
  all:      { label: "تمام ریسپیز", emoji: "🍽️" },
  favorites:{ label: "پسندیدہ",      emoji: "❤️" },
  pakora:   { label: "پکوڑے",        emoji: "🧅" },
  samosa:   { label: "سموسے",        emoji: "🥟" },
  chips:    { label: "چپس",          emoji: "🍟" },
  kabab:    { label: "کباب",         emoji: "🍢" },
  roll:     { label: "رول",          emoji: "🌯" },
  burger:   { label: "برگر",         emoji: "🍔" },
  chaat:    { label: "چاٹ",          emoji: "🥗" },
  pizza:    { label: "پیزا",         emoji: "🍕" },
  shawarma: { label: "شوارما",       emoji: "🌯" },
  rice:     { label: "چاول",         emoji: "🍚" },
};
const URDU_DIGITS = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
function toUrduNum(n){ return String(n).split("").map(c => /[0-9]/.test(c) ? URDU_DIGITS[+c] : c).join(""); }

const FAV_KEY = "zaiqa-khazana-favs";
const CHECK_KEY_PREFIX = "zaiqa-khazana-check-";

let RECIPES = [];
let activeCat = "all";
let searchTerm = "";
let favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));

const el = (id) => document.getElementById(id);
const grid = el("recipeGrid");
const emptyMsg = el("emptyMsg");
const sectionTitle = el("sectionTitle");
const sectionCount = el("sectionCount");
const catShelf = el("catShelf");
const statStrip = el("statStrip");

function saveFavs(){ localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); }

function toast(msg){
  const t = el("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._h);
  toast._h = setTimeout(()=>t.classList.remove("show"), 1800);
}

async function loadData(){
  try{
    // cache-busting query so a stale service-worker cache or old
    // browser HTTP cache can never intercept this with an old/failed response
    const res = await fetch("data.json?v=3", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    RECIPES = await res.json();
  }catch(e){
    grid.innerHTML = `<p style='color:var(--muted);text-align:center;padding:40px;line-height:1.8'>
      ڈیٹا لوڈ نہیں ہو سکا۔<br>
      <span style="font-family:var(--font-mono);font-size:12px;color:var(--chili)">${(e && e.message) ? e.message : e}</span><br><br>
      براہ کرم صفحہ دوبارہ کھولیں۔
    </p>`;
    console.error(e);
    return;
  }
  buildShelf();
  buildStats();
  applyDeepLink();
  render();
}

/* ---------- deep links (manifest shortcuts: ?cat=xxx / ?action=random) ---------- */
function applyDeepLink(){
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat");
  const action = params.get("action");

  if (cat && CAT_META[cat]){
    activeCat = cat;
    [...catShelf.children].forEach(c => c.classList.toggle("active", c.dataset.cat === cat));
  }

  if (action === "random" && RECIPES.length){
    const pick = RECIPES[Math.floor(Math.random()*RECIPES.length)];
    setTimeout(() => openRecipe(pick.id), 150);
  }

  if (cat || action){
    history.replaceState(null, "", location.pathname);
  }
}

function buildStats(){
  const catCount = new Set(RECIPES.map(r=>r.cat)).size;
  statStrip.innerHTML = `
    <span>📖 ${toUrduNum(RECIPES.length)} ریسپیز</span>
    <span>🗂️ ${toUrduNum(catCount)} اقسام</span>
    <span>🇵🇰 دیسی ذائقہ</span>
  `;
}

function countFor(cat){
  if (cat === "all") return RECIPES.length;
  if (cat === "favorites") return favs.size;
  return RECIPES.filter(r=>r.cat===cat).length;
}

function updateShelfCounts(){
  [...catShelf.children].forEach(btn => {
    const lid = btn.querySelector(".tin-lid");
    if (lid) lid.dataset.num = toUrduNum(countFor(btn.dataset.cat));
  });
}

function buildShelf(){
  catShelf.innerHTML = "";
  CAT_ORDER.forEach((cat, i) => {
    const meta = CAT_META[cat];
    const count = countFor(cat);
    const btn = document.createElement("button");
    btn.className = "tin" + (cat===activeCat ? " active" : "");
    btn.dataset.cat = cat;
    btn.innerHTML = `
      <span class="tin-lid" data-num="${toUrduNum(count)}">${meta.emoji}</span>
      <span class="tin-name">${meta.label}</span>
    `;
    btn.addEventListener("click", () => {
      activeCat = cat;
      [...catShelf.children].forEach(c => c.classList.toggle("active", c.dataset.cat===cat));
      render();
      window.scrollTo({top:0, behavior:"smooth"});
    });
    catShelf.appendChild(btn);
  });
}

function filteredRecipes(){
  let list = RECIPES;
  if (activeCat === "favorites") list = list.filter(r => favs.has(r.id));
  else if (activeCat !== "all") list = list.filter(r => r.cat === activeCat);
  if (searchTerm.trim()){
    const q = searchTerm.trim();
    list = list.filter(r =>
      r.title.includes(q) ||
      r.ing.some(i => i.includes(q)) ||
      r.catLabel.includes(q)
    );
  }
  return list;
}

function render(){
  const list = filteredRecipes();
  const meta = CAT_META[activeCat];
  sectionTitle.textContent = searchTerm.trim() ? `تلاش: "${searchTerm.trim()}"` : meta.label;
  sectionCount.textContent = toUrduNum(list.length);

  grid.innerHTML = "";
  emptyMsg.classList.toggle("hidden", list.length !== 0);

  const frag = document.createDocumentFragment();
  list.forEach(r => {
    const card = document.createElement("button");
    card.className = "rcard";
    card.innerHTML = `
      ${favs.has(r.id) ? '<span class="fav-dot">❤️</span>' : ''}
      <span class="remoji">${r.emoji}</span>
      <span class="rtitle">${r.title}</span>
      <span class="rcat">${r.catEmoji} ${r.catLabel}</span>
    `;
    card.addEventListener("click", () => openRecipe(r.id));
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

/* ---------- search ---------- */
el("searchInput").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  render();
});

/* ---------- random picker ---------- */
el("randomBtn").addEventListener("click", () => {
  if (!RECIPES.length) return;
  const pick = RECIPES[Math.floor(Math.random()*RECIPES.length)];
  openRecipe(pick.id);
  toast(`آج کا انتخاب: ${pick.title} 🎉`);
});

/* ---------- recipe sheet ---------- */
const sheet = el("recipeSheet");
const backdrop = el("sheetBackdrop");
const sheetContent = el("sheetContent");

function openRecipe(id){
  const r = RECIPES.find(x => x.id === id);
  if (!r) return;
  const checkedKey = CHECK_KEY_PREFIX + id;
  let checked = new Set(JSON.parse(localStorage.getItem(checkedKey) || "[]"));

  sheetContent.innerHTML = `
    <span class="sc-emoji">${r.emoji}</span>
    <p class="sc-cat">${r.catEmoji} ${r.catLabel}</p>
    <h2 class="sc-title">${r.title}</h2>

    <button class="sc-fav ${favs.has(r.id) ? 'active' : ''}" id="favBtn">
      <span id="favIcon">${favs.has(r.id) ? '❤️' : '🤍'}</span>
      <span id="favLabel">${favs.has(r.id) ? 'پسندیدہ میں شامل' : 'پسندیدہ میں شامل کریں'}</span>
    </button>

    <h3 class="sc-block-title">🧂 اجزاء</h3>
    <ul class="ing-list" id="ingList">
      ${r.ing.map((i, idx) => `<li data-idx="${idx}" class="${checked.has(idx) ? 'checked' : ''}"><span class="chk"></span><span>${i}</span></li>`).join("")}
    </ul>

    <h3 class="sc-block-title">👨‍🍳 بنانے کا طریقہ</h3>
    <ol class="step-list">
      ${r.steps.map(s => `<li>${s}</li>`).join("")}
    </ol>

    <div class="sc-tip">💡 نکتہ: اجزاء پر کلک کریں تاکہ چیک لسٹ کے طور پر استعمال کر سکیں۔</div>
  `;

  sheetContent.querySelectorAll("#ingList li").forEach(li => {
    li.addEventListener("click", () => {
      const idx = +li.dataset.idx;
      li.classList.toggle("checked");
      if (li.classList.contains("checked")) checked.add(idx); else checked.delete(idx);
      localStorage.setItem(checkedKey, JSON.stringify([...checked]));
    });
  });

  el("favBtn").addEventListener("click", () => {
    if (favs.has(r.id)) { favs.delete(r.id); toast("پسندیدہ سے ہٹا دیا گیا"); }
    else { favs.add(r.id); toast("پسندیدہ میں شامل کر لیا گیا ❤️"); }
    saveFavs();
    const btn = el("favBtn");
    btn.classList.toggle("active", favs.has(r.id));
    el("favIcon").textContent = favs.has(r.id) ? "❤️" : "🤍";
    el("favLabel").textContent = favs.has(r.id) ? "پسندیدہ میں شامل" : "پسندیدہ میں شامل کریں";
    updateShelfCounts();
    render();
  });

  sheet.classList.add("show");
  backdrop.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeSheet(){
  sheet.classList.remove("show");
  backdrop.classList.remove("show");
  document.body.style.overflow = "";
}
el("sheetClose").addEventListener("click", closeSheet);
backdrop.addEventListener("click", closeSheet);

/* swipe down to close */
let touchStartY = null;
el("sheetHandle").addEventListener("touchstart", e => touchStartY = e.touches[0].clientY);
el("sheetHandle").addEventListener("touchmove", e => {
  if (touchStartY === null) return;
  const dy = e.touches[0].clientY - touchStartY;
  if (dy > 60) { closeSheet(); touchStartY = null; }
});

/* ---------- init ---------- */
loadData();

/* ---------- service worker ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  });
}
