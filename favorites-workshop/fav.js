/* Избранное и подборки — прототип воркшопа «Бренд-коды в продукте».
   Работает поверх выдачи long-rent-exp-workshop (сниппет new4): index.html
   подключает её CSS и JS через <base href="../long-rent-exp-workshop/">.
   Здесь — таб-бар, экран Избранного 2×3, пустые состояния и подборки.
   Состояние в памяти; сохранение сердцем на выдаче попадает в «Объявления». */
(function () {
  const App = window.App;
  const ASSETS = "../favorites-workshop/img/";
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const plural = (n, f) => {
    const a = n % 10, b = n % 100;
    return f[a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? 1 : 2];
  };
  const fmtPrice = (n) => n.toLocaleString("ru-RU").replace(/,/g, " ") + " ₽";

  // ---------- Данные ----------
  const withPhoto = (l) => l.photos && l.photos.length;
  const RENT = App.LISTINGS.filter((l) => l.dealType === "rent" && l.propertyType === "flat" && withPhoto(l));
  const SALE = App.LISTINGS.filter((l) => l.dealType === "sale" && l.propertyType === "flat" && withPhoto(l));
  const NEWB = SALE.filter((l) => l.isNewbuilding);
  const byId = (id) => App.LISTINGS.find((l) => l.id === id);
  const ids = (arr, from, n) => arr.slice(from, from + n).map((l) => l.id);
  const photo = (id) => {
    const l = byId(id);
    return l && l.photos[0] ? l.photos[0].src : "";
  };

  const SEARCHES = [
    { title: "Снять квартиру, студию в Санкт-Петербурге", kind: "Сохранённый поиск" },
    { title: "Санкт-Петербург, Невский проспект, 28", kind: "Сохранённый адрес" },
    { title: "Снять 2-комнатную квартиру в Санкт-Петербурге у метро", kind: "Сохранённый поиск" },
  ];

  // Живое состояние: всё пусто, наполняется действиями в прототипе
  const store = {
    saved: [], // id объявлений («Объявления»)
    searches: [],
    zhk: [],
    compare: [],
    viewed: [],
    podborki: [], // { id, name, items: [] }
  };

  // ---------- Иконки ----------
  const IC = {
    heart: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-9-5.6-9-11.6C3 6.4 5.3 4 8.2 4c1.6 0 3 .8 3.8 2 .8-1.2 2.2-2 3.8-2C18.7 4 21 6.4 21 9.4 21 15.4 12 21 12 21Z"/></svg>',
    searchHeart: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path fill="#2EA8FF" d="M6.5 9.6S2.5 7.3 2.5 4.8c0-1.3 1-2.3 2.2-2.3.8 0 1.4.4 1.8 1 .4-.6 1-1 1.8-1 1.2 0 2.2 1 2.2 2.3 0 2.5-4 4.8-4 4.8Z"/></svg>',
    zhk: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 11.5 9 9v12H3.8a.8.8 0 0 1-.8-.8v-8.7ZM10.5 5.2 17 3v18h-3v-4h-3.5v4h0V5.2ZM18.5 8 21 9v11.2a.8.8 0 0 1-.8.8h-1.7V8Z"/></svg>',
    compare: '<svg viewBox="0 0 24 24"><rect x="7.5" y="7.5" width="13" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="3" y="3" width="13" height="13" rx="3" fill="currentColor"/><path d="M9.5 6.5v6M6.5 9.5h6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 6.5A2.5 2.5 0 0 1 4.5 4h4l2 2.2h7A2.5 2.5 0 0 1 20 8.7V10H7.2a2 2 0 0 0-1.9 1.4L3 18.6l-1-.1V6.5Z"/><path fill="currentColor" d="M6.7 11.6A1.5 1.5 0 0 1 8.1 10.6h13.3c1 0 1.7 1 1.4 2l-2 6.4A2 2 0 0 1 18.9 20.4H4.2a.9.9 0 0 1-.9-1.2l3.4-7.6Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="currentColor"/><path d="M12 6.8V12h4.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M20 12H4.5M11 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    heartLine: '<svg viewBox="0 0 24 24"><path d="M12 19.5s-7.5-4.7-7.5-9.7C4.5 7.4 6.4 5.5 8.7 5.5c1.4 0 2.6.7 3.3 1.8.7-1.1 1.9-1.8 3.3-1.8 2.3 0 4.2 1.9 4.2 4.3 0 5-7.5 9.7-7.5 9.7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M14.6 3.4a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.1.2l-3.1 3.1.3 3.1a1 1 0 0 1-.3.8l-.9.9a1 1 0 0 1-1.4 0l-3-3-4.6 4.6a.9.9 0 0 1-1.3-1.3l4.6-4.6-3-3a1 1 0 0 1 0-1.4l.9-.9a1 1 0 0 1 .8-.3l3.1.3 3.1-3.1a1 1 0 0 1 .2-1.1l1.2-1.2Z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 14.5V4m0 0L8 8m4-4 4 4M6 11v7.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V11" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M9.5 4C5.4 4 2 6.7 2 10c0 1.6.8 3 2 4.1L3.5 17l3.2-1.4c.9.3 1.8.4 2.8.4 4.1 0 7.5-2.7 7.5-6S13.6 4 9.5 4Z"/><path fill="#fff" opacity=".9" d="M18.6 8.3c.3.5.4 1.1.4 1.7 0 4.1-4 7.3-8.9 7.4 1.4 1.5 3.6 2.6 6.1 2.6.8 0 1.6-.1 2.3-.3l2.9 1.3-.5-2.6c1.3-1.1 2.1-2.5 2.1-4.1 0-2.5-1.8-4.7-4.4-6Z"/></svg>',
  };
  const TAB_IC = {
    home: '<svg viewBox="0 0 28 28"><path fill="currentColor" d="M12.6 3.6a2.2 2.2 0 0 1 2.8 0l9 7.4c.5.4.8 1 .8 1.7v10.1c0 1.2-1 2.2-2.2 2.2h-5.2v-6.6a1.5 1.5 0 0 0-1.5-1.5h-4.6a1.5 1.5 0 0 0-1.5 1.5V25H5a2.2 2.2 0 0 1-2.2-2.2V12.7c0-.7.3-1.3.8-1.7l9-7.4Z"/></svg>',
    search: '<svg viewBox="0 0 28 28"><circle cx="12.5" cy="12.5" r="7.5" fill="none" stroke="currentColor" stroke-width="3.4"/><path d="m18.2 18.2 6 6" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/></svg>',
    fav: '<svg viewBox="0 0 28 28"><path fill="currentColor" d="M14 25s-11-6.8-11-14.1C3 7.2 5.8 4.3 9.4 4.3c1.9 0 3.6.9 4.6 2.4 1-1.5 2.7-2.4 4.6-2.4 3.6 0 6.4 2.9 6.4 6.6C25 18.2 14 25 14 25Z"/></svg>',
    chats: '<svg viewBox="0 0 28 28"><path fill="currentColor" d="M14 3.5C7.6 3.5 2.5 7.8 2.5 13.1c0 2.9 1.5 5.5 3.9 7.3l-.6 4.3c-.1.6.6 1.1 1.1.8l4.4-2.5c.9.2 1.8.3 2.7.3 6.4 0 11.5-4.3 11.5-9.6S20.4 3.5 14 3.5Z"/></svg>',
    profile: '<svg viewBox="0 0 28 28"><circle cx="14" cy="8.6" r="5.6" fill="currentColor"/><path fill="currentColor" d="M3.5 23.6c0-4.7 4.7-8.1 10.5-8.1s10.5 3.4 10.5 8.1c0 .9-.7 1.6-1.6 1.6H5.1c-.9 0-1.6-.7-1.6-1.6Z"/></svg>',
  };

  // ---------- Разделы Избранного ----------
  const SECTIONS = [
    { key: "saved", title: "Объявления", icon: IC.heart, preview: "collage" },
    { key: "searches", title: "Мои поиски", icon: IC.searchHeart, preview: "search" },
    { key: "zhk", title: "ЖК", icon: IC.zhk, preview: "collage" },
    { key: "compare", title: "Сравнение", icon: IC.compare, preview: "stack" },
    { key: "podborki", title: "Подборки", icon: IC.folder, preview: "collage" },
    { key: "viewed", title: "Вы смотрели", icon: IC.clock, preview: "collage" },
  ];

  const EMPTY = {
    saved: { title: "Объявления", img: "izbrannoe", h: "Добавляйте объявления в избранное", p: "Отмечайте интересные объявления и следите за изменением цены", btn: "Искать объявления", act: "search" },
    searches: { title: "Поиски", img: "sohr-poisk", h: "Сохраняйте поиски — экономьте время", p: "Так вы подпишетесь на уведомления о новых объявлениях", btn: "Сохранить последний поиск", act: "save-search" },
    zhk: { title: "ЖК", img: "zhk", h: "Сохраняйте интересные жилые комплексы", p: "Будьте в курсе новых предложений в ЖК, которые вам нравятся", btn: "Искать новостройки", act: "search" },
    // Текста для пустого «Сравнения» в макетах нет — временный, поправить по макету
    compare: { title: "Сравнение", img: "sravnenie-kvartir", h: "Сравнивайте квартиры и ЖК", p: "Нажмите «Сравнить» в карточке — покажем отличия рядом", btn: "Искать объявления", act: "search" },
    viewed: { title: "Вы смотрели", img: "vy-smotreli", h: "Нет ну ты посмотри!", p: "Здесь будут объявления, которые вы посмотрели за последние 30 дней", btn: "Искать объявления", act: "search" },
    newPodborka: { img: "novaya-podborka", h: "Тут пока пусто", p: "Нажмите 💙 на объявлении, а затем — «Сохранить в подборку»", btn: "Перейти к поиску", act: "search" },
  };
  const PODBORKI_EMPTY = {
    b2c: [
      ["pin", "#FF6A1F", "Похожие объекты в одном месте", "Разложите объявления по папкам или соберите в одну"],
      ["share", "#F5B11F", "Легко делиться с близкими", "Настройте вид и поделитесь на отдельной странице"],
      ["chat", "#1EA3FF", "С обратной связью", "Узнайте, какие объекты понравились: получайте лайки и комментарии"],
    ],
  };

  // ---------- Превью плиток ----------
  function collageHtml(list) {
    const p = list.slice(0, 3).map(photo);
    const img = (src) => `<span class="fw-col__img" style="background-image:url('${src}')"></span>`;
    if (p.length === 0) return `<div class="fw-col fw-col--1"><span class="fw-col__img"></span></div>`;
    if (p.length === 1) return `<div class="fw-col fw-col--1">${img(p[0])}</div>`;
    if (p.length === 2) return `<div class="fw-col fw-col--2">${img(p[0])}${img(p[1])}</div>`;
    return `<div class="fw-col fw-col--3">${img(p[0])}<span class="fw-col__side">${img(p[1])}${img(p[2])}</span></div>`;
  }
  function stackHtml(list) {
    const p = list.slice(0, 3).map(photo);
    const n = p.length;
    return `<div class="fw-stack fw-stack--${n}">${p
      .map((src, i) => `<span class="fw-stack__card" style="--i:${i};z-index:${3 - i};background-image:url('${src}')"></span>`)
      .join("")}</div>`;
  }
  function searchPreviewHtml(list) {
    const s = list[0];
    return `<div class="fw-search"><div class="fw-search__card"><div class="fw-search__title">${esc(s.title)}</div><div class="fw-search__kind">${esc(s.kind)}</div></div></div>`;
  }
  function emptyTileHtml(icon) {
    return `<div class="fw-empty-tile">
      <svg class="fw-empty-tile__folder" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 41Q0 37 4 37H33Q36 37 38 39.5L43 45.5Q45 48 49 48H96Q100 48 100 52V100H0Z"/></svg>
      <span class="fw-empty-tile__icon">${icon}</span>
    </div>`;
  }

  function tileHtml(sec) {
    const list = sec.key === "podborki" ? podborkiCover() : store[sec.key];
    const count = sec.key === "podborki" ? store.podborki.length : store[sec.key].length;
    const filled = count > 0;
    let preview;
    if (!filled) preview = emptyTileHtml(sec.icon);
    else if (sec.preview === "stack") preview = stackHtml(list);
    else if (sec.preview === "search") preview = searchPreviewHtml(list);
    else preview = collageHtml(list);
    // Бейджи («Цена снизилась», «Есть новое») появятся, когда будет событие; в живом прототипе их пока нет
    const badge = "";
    const heart = filled && sec.key === "saved" ? `<span class="fw-tile__heart">${IC.heart}</span>` : "";
    return `<button class="fw-tile${filled ? " is-filled" : ""}" type="button" data-section="${sec.key}">
      <span class="fw-tile__preview">${preview}${badge}</span>
      <span class="fw-tile__label">${heart}${sec.title}${filled ? ` <span class="fw-tile__count">${count}</span>` : ""}</span>
    </button>`;
  }
  // Обложка плитки «Подборки»: по первому объекту каждой подборки
  function podborkiCover() {
    return store.podborki.filter((p) => p.items.length).map((p) => p.items[0]);
  }

  // ---------- Мини-сниппет «Могут подойти» ----------
  function miniCardHtml(l) {
    const saved = store.saved.includes(l.id);
    const params = [l.rooms ? `${l.rooms}-к. кв.` : "Студия", `${String(l.area).replace(".", ",")} м²`, `${l.floor}/${l.floorsTotal} эт.`].join(" · ");
    const metro = l.metro ? `<span class="fw-mini__metro"><i style="background:#${l.metroColor || "0468FF"}"></i>${esc(l.metro)}</span>` : "";
    return `<div class="fw-mini" data-id="${l.id}">
      <div class="fw-mini__photo" style="background-image:url('${photo(l.id)}')">
        <button class="fw-mini__heart${saved ? " is-active" : ""}" type="button" aria-label="В избранное">${saved ? IC.heart : IC.heartLine}</button>
      </div>
      <div class="fw-mini__price">${fmtPrice(l.price)}${l.dealType === "rent" ? "/мес." : ""}</div>
      <div class="fw-mini__params">${params}</div>
      ${metro}
    </div>`;
  }

  // ---------- Экраны ----------
  const stack = []; // экраны вкладки «Избранное»: { type, ... }
  let tab = "search";

  function headerHtml(title, { back = true, right = "" } = {}) {
    return `<div class="fw-head">
      ${back ? `<button class="fw-head__back" type="button" data-act="back" aria-label="Назад">${IC.back}</button>` : "<span></span>"}
      <div class="fw-head__title">${esc(title)}</div>
      <span class="fw-head__right">${right}</span>
    </div>`;
  }

  function emptyStateHtml(e) {
    return `<div class="fw-es">
      <img class="fw-es__img" src="${ASSETS}empty/${e.img}.png" alt="" />
      <div class="fw-es__h">${esc(e.h)}</div>
      <div class="fw-es__p">${esc(e.p)}</div>
      <button class="fw-btn fw-btn--light" type="button" data-act="${e.act}">${esc(e.btn)}</button>
    </div>`;
  }

  function screenHome() {
    const order = SECTIONS.slice().sort((a, b) => isFilled(b) - isFilled(a));
    const recs = RENT.slice(10, 18);
    return `<div class="fw-scroll fw-home">
      <div class="fw-home__top">
        <div class="fw-head fw-head--plain"><span></span><div class="fw-head__title">Избранное</div><span></span></div>
        <div class="fw-grid">${order.map(tileHtml).join("")}</div>
      </div>
      <div class="fw-home__recs">
        <div class="fw-h2">Могут подойти</div>
        <div class="fw-recs">${recs.map(miniCardHtml).join("")}</div>
      </div>
    </div>`;
  }
  const isFilled = (sec) => (sec.key === "podborki" ? store.podborki.length : store[sec.key].length) > 0;

  function screenSection(key) {
    if (key === "saved") {
      if (!store.saved.length) return `<div class="fw-scroll">${headerHtml("Объявления")}${emptyStateHtml(EMPTY.saved)}</div>`;
      return `<div class="fw-scroll">${headerHtml("Объявления")}<div class="fw-count">${store.saved.length} ${plural(store.saved.length, ["объявление", "объявления", "объявлений"])}</div><div class="fw-cards" data-cards="saved"></div></div>`;
    }
    if (key === "podborki") return screenPodborki();
    return `<div class="fw-scroll">${headerHtml(EMPTY[key].title)}${emptyStateHtml(EMPTY[key])}</div>`;
  }

  function screenPodborki() {
    if (!store.podborki.length) {
      const rows = PODBORKI_EMPTY.b2c
        .map(([ic, color, t, d]) => `<div class="fw-feat"><span class="fw-feat__ic" style="background:${color}">${IC[ic]}</span><span><b>${esc(t)}</b><span>${esc(d)}</span></span></div>`)
        .join("");
      return `<div class="fw-scroll">${headerHtml("Подборки")}
        <div class="fw-es fw-es--podborki">
          <img class="fw-es__img" src="${ASSETS}empty/podborki.png" alt="" />
          <div class="fw-es__h">Здесь будут подборки</div>
          <div class="fw-feats">${rows}</div>
          <button class="fw-btn fw-btn--primary" type="button" data-act="create">Создать подборку</button>
          <button class="fw-link" type="button" data-act="howto">Как работать с подборками</button>
        </div></div>`;
    }
    const rows = store.podborki
      .map((p) => {
        const cover = p.items.slice(0, 3);
        const thumb = cover.length ? collageHtml(cover) : `<span class="fw-row__ph"></span>`;
        return `<button class="fw-row" type="button" data-podborka="${p.id}">
          <span class="fw-row__thumb">${thumb}</span>
          <span class="fw-row__body"><span class="fw-row__title">${esc(p.name)}</span><span class="fw-row__sub">${p.items.length} ${plural(p.items.length, ["объявление", "объявления", "объявлений"])}</span></span>
          <span class="fw-row__more">${IC.more}</span>
        </button>`;
      })
      .join("");
    return `<div class="fw-scroll">${headerHtml("Подборки")}
      <button class="fw-row fw-row--new" type="button" data-act="create"><span class="fw-row__thumb fw-row__thumb--plus">${IC.plus}</span><span class="fw-row__body"><span class="fw-row__title">Новая подборка</span></span></button>
      ${rows}</div>`;
  }

  function screenPodborka(id) {
    const p = store.podborki.find((x) => x.id === id);
    if (!p) return screenPodborki();
    if (!p.items.length) return `<div class="fw-scroll">${headerHtml(p.name)}${emptyStateHtml(EMPTY.newPodborka)}</div>`;
    return `<div class="fw-scroll">${headerHtml(p.name)}<div class="fw-count">${p.items.length} ${plural(p.items.length, ["объявление", "объявления", "объявлений"])}</div><div class="fw-cards" data-cards="podborka:${p.id}"></div></div>`;
  }

  // ---------- Отрисовка ----------
  let root, tabbar;

  function rerender() {
    if (!root) return;
    const top = stack[stack.length - 1] || { type: "home" };
    let html;
    if (top.type === "home") html = screenHome();
    else if (top.type === "section") html = screenSection(top.key);
    else if (top.type === "podborka") html = screenPodborka(top.id);
    const prevScroll = root.dataset.screen === JSON.stringify(top) ? ($(".fw-scroll", root) || {}).scrollTop : 0;
    root.innerHTML = html;
    root.dataset.screen = JSON.stringify(top);
    // Сниппеты new4 — тем же кодом, что и на выдаче
    root.querySelectorAll("[data-cards]").forEach((box) => {
      const src = box.dataset.cards;
      const list = src === "saved" ? store.saved : (store.podborki.find((p) => "podborka:" + p.id === src) || { items: [] }).items;
      list.map(byId).filter(Boolean).forEach((item) => {
        const card = App.createCardEl(item, false);
        syncCardHeart(card);
        box.appendChild(card);
      });
    });
    const sc = $(".fw-scroll", root);
    if (sc && prevScroll) sc.scrollTop = prevScroll;
    // Появление сниппетов — как на выдаче (motion.js следит только за #results-list)
    const cards = root.querySelectorAll(".card--n4");
    if (cards.length && "IntersectionObserver" in window) {
      let batch = 0;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.style.setProperty("--in-delay", `${Math.min(batch++, 4) * 40}ms`);
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          });
          requestAnimationFrame(() => (batch = 0));
        },
        { root: sc, threshold: 0.08 }
      );
      cards.forEach((c) => io.observe(c));
    } else cards.forEach((c) => c.classList.add("is-in"));
  }

  function setTab(t) {
    tab = t;
    document.body.classList.toggle("fw-on-fav", t === "fav");
    tabbar.querySelectorAll(".fw-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === t));
    if (t === "fav") rerender();
    else syncResultHearts();
  }

  function push(screen) {
    stack.push(screen);
    rerender();
    const sc = $(".fw-scroll", root);
    if (sc) sc.scrollTop = 0;
  }

  let toastTimer;
  function toast(text) {
    let t = $(".fw-toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "fw-toast";
      $(".app").appendChild(t);
    }
    t.textContent = text;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-on"), 2200);
  }

  // ---------- Сердце на сниппетах new4 ↔ «Объявления» ----------
  function syncCardHeart(card) {
    const fav = card.querySelector(".n4__fav");
    if (!fav) return;
    const on = store.saved.includes(card.dataset.listingId);
    fav.classList.toggle("is-active", on);
    fav.innerHTML = on ? App.ICONS.heartFilled20 : App.ICONS.heart20;
  }
  function syncResultHearts() {
    document.querySelectorAll("#results-list .card--n4").forEach(syncCardHeart);
  }
  // Обработчик в cards.js переключает класс; мы читаем результат после него
  document.addEventListener(
    "click",
    (e) => {
      const fav = e.target.closest(".n4__fav");
      if (!fav) return;
      const card = fav.closest("[data-listing-id]");
      if (!card) return;
      setTimeout(() => {
        const id = card.dataset.listingId;
        const on = fav.classList.contains("is-active");
        store.saved = store.saved.filter((x) => x !== id);
        if (on) store.saved.unshift(id);
      }, 0);
    },
    true
  );

  // ---------- События экрана Избранного ----------
  function onRootClick(e) {
    const act = e.target.closest("[data-act]");
    const tile = e.target.closest("[data-section]");
    const row = e.target.closest("[data-podborka]");
    const mini = e.target.closest(".fw-mini__heart");
    if (mini) {
      const id = mini.closest(".fw-mini").dataset.id;
      const on = !store.saved.includes(id);
      store.saved = store.saved.filter((x) => x !== id);
      if (on) store.saved.unshift(id);
      mini.classList.toggle("is-active", on);
      mini.innerHTML = on ? IC.heart : IC.heartLine;
      if (on && App.playFavCharge) App.playFavCharge(mini);
      clearTimeout(onRootClick.t);
      onRootClick.t = setTimeout(() => {
        // Обновляем плитки, не трогая блок «Могут подойти»
        const grid = $(".fw-grid", root);
        if (grid) grid.innerHTML = SECTIONS.slice().sort((a, b) => isFilled(b) - isFilled(a)).map(tileHtml).join("");
      }, 350);
      return;
    }
    if (tile) {
      const key = tile.dataset.section;
      const filled = tile.classList.contains("is-filled");
      if (!filled || key === "saved" || key === "podborki") push({ type: "section", key });
      else toast("Этот раздел в прототипе не открывается");
      return;
    }
    if (row) return push({ type: "podborka", id: row.dataset.podborka });
    if (!act) return;
    const a = act.dataset.act;
    if (a === "back") {
      stack.pop();
      rerender();
    } else if (a === "search") {
      stack.length = 0;
      setTab("search");
    } else if (a === "save-search") {
      store.searches.unshift(SEARCHES[0]);
      stack.pop();
      rerender();
      toast("Поиск сохранён");
    } else if (a === "create") openCreateSheet();
    else if (a === "howto") toast("Инструкция в прототипе не открывается");
  }

  // ---------- Шторка «Новая подборка» ----------
  function openCreateSheet() {
    const wrap = document.createElement("div");
    wrap.className = "fw-sheet-wrap";
    wrap.innerHTML = `<div class="fw-sheet-backdrop"></div>
      <div class="fw-sheet">
        <div class="fw-sheet__handle"></div>
        <div class="fw-sheet__title">Новая подборка</div>
        <label class="fw-field"><span>Название</span><input type="text" value="" placeholder="Например, двушки у метро" maxlength="40" /></label>
        <button class="fw-btn fw-btn--primary" type="button" data-sheet="create">Создать</button>
      </div>`;
    $(".app").appendChild(wrap);
    const input = $("input", wrap);
    requestAnimationFrame(() => wrap.classList.add("is-open"));
    const close = () => {
      wrap.classList.remove("is-open");
      setTimeout(() => wrap.remove(), 250);
    };
    $(".fw-sheet-backdrop", wrap).addEventListener("click", close);
    $('[data-sheet="create"]', wrap).addEventListener("click", () => {
      const name = input.value.trim() || "Новая подборка";
      const p = { id: "p" + Date.now(), name, items: [] };
      store.podborki.unshift(p);
      close();
      if (!stack.length || stack[stack.length - 1].key !== "podborki") stack.push({ type: "section", key: "podborki" });
      push({ type: "podborka", id: p.id });
    });
  }

  // ---------- Сборка ----------
  function buildTabbar() {
    tabbar = document.createElement("nav");
    tabbar.className = "fw-tabbar";
    const tabs = [
      ["home", "Главная", TAB_IC.home, '<span class="fw-tab__badge">1</span>'],
      ["search", "Поиск", TAB_IC.search, ""],
      ["fav", "Избранное", TAB_IC.fav, ""],
      ["chats", "Сообщения", TAB_IC.chats, ""],
      ["profile", "Кабинет", TAB_IC.profile, ""],
    ];
    tabbar.innerHTML = tabs
      .map(([id, label, ic, extra]) => `<button class="fw-tab" type="button" data-tab="${id}"><span class="fw-tab__ic">${ic}${extra}</span><span class="fw-tab__label">${label}</span></button>`)
      .join("");
    tabbar.addEventListener("click", (e) => {
      const b = e.target.closest(".fw-tab");
      if (!b) return;
      const t = b.dataset.tab;
      if (t === "fav") {
        if (tab === "fav") stack.length = 0; // повторный тап — к корню Избранного
        setTab("fav");
      } else if (t === "search") setTab("search");
      else toast("В прототипе есть только «Поиск» и «Избранное»");
    });
    $(".app").appendChild(tabbar);
  }

  // «Вы смотрели»: тап по сниппету (не по кнопкам) = открыл объявление
  const CARD_CONTROLS = ".card__btn, .card__gallery-btn, .card__gallery-badge, .card__labels, .n2__control, .n3__control, .asis__extra";
  document.addEventListener(
    "click",
    (e) => {
      const card = e.target.closest(".card--n4[data-listing-id]");
      if (!card || e.target.closest(CARD_CONTROLS)) return;
      const id = card.dataset.listingId;
      store.viewed = [id].concat(store.viewed.filter((x) => x !== id));
    },
    true
  );

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("fw");
    root = document.createElement("div");
    root.className = "fw-root";
    root.addEventListener("click", onRootClick);
    $(".app").appendChild(root);
    buildTabbar();
    const setH = () => $(".app").style.setProperty("--fw-tabbar-h", tabbar.offsetHeight + "px");
    setH();
    window.addEventListener("resize", setH);
    const q = new URLSearchParams(location.search);
    // Сердца выдачи — по состоянию «Объявлений», в том числе у дорисованных при скролле
    const list = document.getElementById("results-list");
    if (list) new MutationObserver(syncResultHearts).observe(list, { childList: true });
    setTab(q.get("tab") === "fav" ? "fav" : "search");
  });
})();
