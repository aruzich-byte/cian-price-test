/* Избранное и подборки — прототип воркшопа «Бренд-коды в продукте».
   Работает поверх выдачи long-rent-exp-workshop (сниппет new4): index.html
   подключает её CSS и JS через <base href="../long-rent-exp-workshop/">.
   Здесь — таб-бар, экран Избранного 2×3, пустые состояния и подборки.
   Состояние в памяти; сохранение сердцем на выдаче попадает в «Объявления». */
(function () {
  const App = window.App;
  const ASSETS = "../favorites-workshop/img/";

  // ---------- Вариант сниппета (Katya 27.11): as is · v1 · v4 ----------
  // Выдача воркшопа всегда new4; здесь берём ?variant= и снимаем классы new4 до первой отрисовки.
  const VARIANTS = [["asis", "as is"], ["new", "v1"], ["new4", "v4"]];
  // Итог Katya 27.11: в прототипе только v1. as is и v4 остаются в коде и открываются ссылкой ?variant=asis|new4
  const qVariant = new URLSearchParams(location.search).get("variant") || "new";
  if (VARIANTS.some(([v]) => v === qVariant) && qVariant !== App.session.variant) {
    App.session.variant = qVariant;
    document.documentElement.classList.remove("variant-new4", "n2-photo-dark");
  }
  // Сердце на сниппете любого варианта
  const HEART_SEL = '.n4__fav, .card__gallery-btn[aria-label="В избранное"]';
  const isN4Heart = (b) => b.classList.contains("n4__fav");
  function paintHeart(b, on) {
    b.classList.toggle("is-active", on);
    b.innerHTML = isN4Heart(b) ? (on ? App.ICONS.heartFilled20 : App.ICONS.heart20) : on ? App.ICONS.heartFilled : App.ICONS.heart;
  }
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const plural = (n, f) => {
    const a = n % 10, b = n % 100;
    return f[a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? 1 : 2];
  };
  const fmtPrice = (n) => n.toLocaleString("ru-RU").replace(/,/g, " ") + " ₽";
  const SUFFIX = { rent: "/мес.", daily: "/сут." };
  const priceStr = (l) => (l.dealType === "daily" ? "от " : "") + fmtPrice(l.price) + (SUFFIX[l.dealType] || "");

  // ---------- Данные ----------
  // Убираем неудачные первые фото (Katya 26.11): Вознесенский, 3-5 — два уличных фото со стрелками
  [["206752605", 2]].forEach(([id, n]) => {
    const l = App.LISTINGS.find((x) => x.id === id);
    if (l && l.photos && l.photos.length > n) l.photos = l.photos.slice(n);
  });
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
  // Подборки — отдельными плитками на главном экране Избранного, обновлённые выше.
  // Первая фотка коллажа — обложка подборки. Плитка «Подборки» остаётся, пока подборок нет.
  function podborkaTileHtml(p) {
    const list = [p.cover].concat(p.items.filter((x) => x !== p.cover)).filter(Boolean);
    const n = p.items.length;
    return `<button class="fw-tile is-filled" type="button" data-podborka-tile="${p.id}">
      <span class="fw-tile__preview">${collageHtml(list)}</span>
      <span class="fw-tile__label">${esc(p.name)} <span class="fw-tile__count">${n}</span></span>
    </button>`;
  }
  function gridHtml() {
    const pods = store.podborki.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
    const secs = SECTIONS.filter((s) => s.key !== "podborki" || !pods.length).sort((a, b) => isFilled(b) - isFilled(a));
    return pods.map(podborkaTileHtml).join("") + secs.map(tileHtml).join("");
  }
  // Обложка плитки «Подборки»: по первому объекту каждой подборки
  function podborkiCover() {
    return store.podborki.filter((p) => p.cover || p.items.length).map((p) => p.cover || p.items[0]);
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
      <div class="fw-mini__price">${priceStr(l)}</div>
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
    // Итог Katya 27.11: прототип — только посуточная аренда, «Могут подойти» тоже посуточные
    const daily = App.state && App.state.dealType === "daily";
    const pool = daily ? App.LISTINGS.filter((l) => l.dealType === "daily" && l.propertyType === "flat" && withPhoto(l)) : RENT;
    const recs = pool.slice(pool.length > 18 ? 10 : 0, pool.length > 18 ? 18 : 8);
    return `<div class="fw-scroll fw-home">
      <div class="fw-home__top">
        <div class="fw-head fw-head--plain"><span></span><div class="fw-head__title">Избранное</div><span></span></div>
        <div class="fw-grid">${gridHtml()}</div>
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
        const cover = p.cover ? [p.cover] : p.items.slice(0, 3);
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
    if (window.FWT) return window.FWT.screen(p);
    if (!p.items.length) return `<div class="fw-scroll">${headerHtml(p.name)}${emptyStateHtml(EMPTY.newPodborka)}</div>`;
    return `<div class="fw-scroll">${headerHtml(p.name)}<div class="fw-count">${p.items.length} ${plural(p.items.length, ["объявление", "объявления", "объявлений"])}</div><div class="fw-cards" data-cards="podborka:${p.id}"></div></div>`;
  }

  // ---------- Отрисовка ----------
  let root, tabbar;

  function rerender() {
    if (!root) return;
    const top = tab === "home" ? { type: "main" } : stack[stack.length - 1] || { type: "home" };
    let html;
    if (top.type === "home") html = screenHome();
    else if (top.type === "section") html = screenSection(top.key);
    else if (top.type === "podborka") html = screenPodborka(top.id);
    else if (window.FWT && window.FWT.screens[top.type]) html = window.FWT.screens[top.type](top);
    const prevScroll = root.dataset.screen === JSON.stringify(top) ? ($(".fw-scroll", root) || {}).scrollTop : 0;
    root.innerHTML = html;
    root.dataset.screen = JSON.stringify(top);
    // Сниппеты new4 — тем же кодом, что и на выдаче
    root.querySelectorAll("[data-cards]").forEach((box) => {
      const src = box.dataset.cards;
      const list = src === "saved" ? store.saved : (store.podborki.find((p) => "podborka:" + p.id === src) || { items: [] }).items.slice().sort(window.FWT ? window.FWT.sorter(src) : () => 0);
      list.map(byId).filter(Boolean).forEach((item) => {
        const card = App.createCardEl(item, false);
        syncCardHeart(card);
        box.appendChild(card);
      });
    });
    if (window.FWT) window.FWT.after(root, top);
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
    document.body.classList.toggle("fw-on-fav", t === "fav" || t === "home");
    tabbar.querySelectorAll(".fw-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === t));
    if (t === "fav" || t === "home") rerender();
    else syncResultHearts();
  }

  function push(screen) {
    stack.push(screen);
    rerender();
    const sc = $(".fw-scroll", root);
    if (sc) sc.scrollTop = 0;
  }

  let toastTimer;
  function toast(text, action, timer, opts) {
    let t = $(".fw-toast");
    if (!t) {
      t = document.createElement("div");
      $(".app").appendChild(t);
    }
    const on = t.classList.contains("is-on");
    t.className = "fw-toast" + (opts && opts.cls ? " " + opts.cls : "") + (on ? " is-on" : "");
    t.textContent = text;
    if (opts && opts.icon) t.insertAdjacentHTML("afterbegin", `<span class="fw-toast__ico">${opts.icon}</span>`);
    clearInterval(toast.tick);
    if (timer) {
      // обратный отсчёт: кольцо + секунды, пока можно вернуть
      const tm = document.createElement("span");
      tm.className = "fw-toast__timer";
      tm.style.setProperty("--fw-t", timer + "s");
      tm.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg><b>${timer}</b>`;
      t.prepend(tm);
      let left = timer;
      toast.tick = setInterval(() => {
        left -= 1;
        if (left <= 0) return clearInterval(toast.tick);
        tm.querySelector("b").textContent = left;
      }, 1000);
    }
    if (action) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fw-toast__act";
      b.textContent = action.label;
      b.addEventListener("click", () => {
        t.classList.remove("is-on");
        action.run();
      });
      t.appendChild(b);
    }
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-on"), timer ? timer * 1000 : action ? 4500 : 2200);
  }

  // Сердце сохраняет сразу (принцип 1), подборка — опционально через снек (1A → 2A Ани)
  // Figma «ВСЕ СХЛОПЫВАЕМ» → «Тюним снекбар» (27.11): светлый снек «В избранном | В подборку»
  function notifySaved(id) {
    if (window.FWT) toast("В избранном", { label: "В подборку", run: () => window.FWT.openPick(id) }, 0, { cls: "fw-toast--saved", icon: App.ICONS.heartFilled });
  }

  // ---------- Зажатие сердца → быстрый выбор подборки (Figma «Зажатие лайка → шорткаты») ----------
  const LONG_MS = 450;
  let lp = null;
  document.addEventListener(
    "pointerdown",
    (e) => {
      const fav = e.target.closest(HEART_SEL);
      const card = fav && fav.closest(".card[data-listing-id]");
      if (!card || !window.FWT) return;
      const x = e.clientX, y = e.clientY;
      lp = { fav, x, y, timer: setTimeout(() => {
        fav._lp = true;
        hideHint();
        const id = card.dataset.listingId;
        if (!store.saved.includes(id)) {
          paintHeart(fav, true);
          setSaved(id, true);
          favCharge(fav);
        }
        if (navigator.vibrate) navigator.vibrate(10);
        window.FWT.openQuick(id, fav);
      }, LONG_MS) };
    },
    true
  );
  const lpCancel = (e) => {
    if (!lp) return;
    if (e.type === "pointermove" && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) < 8) return;
    clearTimeout(lp.timer);
    lp = null;
  };
  ["pointerup", "pointercancel", "pointermove", "scroll"].forEach((t) => document.addEventListener(t, lpCancel, true));
  document.addEventListener("contextmenu", (e) => e.target.closest(HEART_SEL) && e.preventDefault(), true);

  // Подсказка один раз за сессию после первого сердца (как у TikTok)
  let hintShown = false, hintEl = null;
  function hideHint() {
    if (hintEl) hintEl.remove();
    hintEl = null;
  }
  function showHoldHint(fav) {
    if (hintShown || !window.FWT) return;
    hintShown = true;
    const app = $(".app");
    const a = app.getBoundingClientRect(), r = fav.getBoundingClientRect();
    const k = a.width / app.offsetWidth || 1;
    hintEl = document.createElement("div");
    hintEl.className = "fw-hold-hint";
    hintEl.textContent = "Нажмите и удерживайте, чтобы быстро добавить в подборку";
    hintEl.style.top = (r.bottom - a.top) / k + 8 + "px";
    const cx = (r.left + r.width / 2 - a.left) / k;
    if (cx < app.offsetWidth / 2) {
      const left = Math.max(12, (r.left - a.left) / k - 4);
      hintEl.style.left = left + "px";
      hintEl.classList.add("is-left");
      hintEl.style.setProperty("--arrow-l", Math.max(10, cx - left) + "px");
    } else {
      hintEl.style.right = Math.max(12, (a.right - r.right) / k - 4) + "px";
      hintEl.style.setProperty("--arrow-r", Math.max(12, (r.right - r.left) / 2 / k) + "px");
    }
    app.appendChild(hintEl);
    setTimeout(hideHint, 4000);
    setTimeout(() => document.addEventListener("pointerdown", hideHint, { once: true, capture: true }), 0);
  }

  // ---------- Сердце на сниппетах new4 ↔ «Объявления» ----------
  function syncCardHeart(card) {
    const fav = card.querySelector(HEART_SEL);
    if (!fav) return;
    paintHeart(fav, store.saved.includes(card.dataset.listingId));
  }
  function syncResultHearts() {
    document.querySelectorAll("#results-list .card[data-listing-id]").forEach(syncCardHeart);
  }
  // Обработчик в cards.js переключает класс; мы читаем результат после него
  document.addEventListener(
    "click",
    (e) => {
      const fav = e.target.closest(HEART_SEL);
      if (!fav) return;
      const card = fav.closest(".card[data-listing-id]");
      if (!card) return;
      // Отпустили после зажатия — шорткат уже открыт, тап не считаем
      if (fav._lp) {
        fav._lp = false;
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      // В as is и v1 у сердца нет своего обработчика — переключаем сами, с тем же «зарядом»
      if (!isN4Heart(fav)) {
        e.stopPropagation();
        const willOn = !store.saved.includes(card.dataset.listingId);
        paintHeart(fav, willOn);
        if (willOn) favCharge(fav);
      }
      setTimeout(() => {
        const id = card.dataset.listingId;
        const on = fav.classList.contains("is-active");
        setSaved(id, on);
        if (on) {
          notifySaved(id);
          showHoldHint(fav);
        }
      }, 0);
    },
    true
  );

  // ---------- События экрана Избранного ----------
  function onRootClick(e) {
    const act = e.target.closest("[data-act]");
    const tile = e.target.closest("[data-section]");
    const row = e.target.closest("[data-podborka]");
    const ptile = e.target.closest("[data-podborka-tile]");
    if (ptile) return push({ type: "podborka", id: ptile.dataset.podborkaTile });
    const mini = e.target.closest(".fw-mini__heart");
    if (mini) {
      const id = mini.closest(".fw-mini").dataset.id;
      const on = !store.saved.includes(id);
      setSaved(id, on);
      mini.classList.toggle("is-active", on);
      mini.innerHTML = on ? IC.heart : IC.heartLine;
      if (on && App.playFavCharge) App.playFavCharge(mini);
      if (on) notifySaved(id);
      clearTimeout(onRootClick.t);
      onRootClick.t = setTimeout(() => {
        // Обновляем плитки, не трогая блок «Могут подойти»
        const grid = $(".fw-grid", root);
        if (grid) grid.innerHTML = gridHtml();
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
      // из подборки — сразу на главный экран Избранного, где подборки лежат плитками (Katya 26.11)
      if ((stack[stack.length - 1] || {}).type === "podborka") stack.length = 0;
      else stack.pop();
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
    if (window.FWT) return window.FWT.openCreate();
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
      const p = { id: "p" + Date.now(), name, items: [], updated: Date.now() };
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
      else if (t === "home" && window.FWT) setTab("home");
      else toast("В прототипе есть только «Поиск» и «Избранное»");
    });
    $(".app").appendChild(tabbar);
  }

  // ---------- Карточка объекта (по макету «Sale · B») ----------
  // Открывается тапом по сниппету new4 (выдача, «Объявления», подборка), по мини-сниппету
  // «Могут подойти» и по «Похожим». Открытие = объект в «Вы смотрели».
  // Сердце — то же, что на сниппете new4: иконка и «заряд аберрации» #E85810.
  const HEART_PATH = "M8 14.86S0 10.6 0 5.86C0 3.17 2.21 1 4.93 1c1.16 0 2.23.4 3.07 1.06A4.95 4.95 0 0 1 11.07 1C13.79 1 16 3.17 16 5.86 16 10.6 8 14.86 8 14.86Z";
  function favCharge(btn) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    btn.classList.remove("is-charging");
    btn.querySelectorAll(".n4__fav-aura").forEach((el) => el.remove());
    void btn.offsetWidth;
    const aura = document.createElement("span");
    aura.className = "n4__fav-aura";
    aura.setAttribute("aria-hidden", "true");
    aura.innerHTML = `<svg viewBox="-8 -8 32 32"><path class="n4__fav-aura-outer" d="${HEART_PATH}"/><path class="n4__fav-aura-inner" d="${HEART_PATH}"/></svg>`;
    btn.prepend(aura);
    btn.classList.add("is-charging");
    clearTimeout(btn._chargeTimer);
    btn._chargeTimer = setTimeout(() => {
      btn.classList.remove("is-charging");
      aura.remove();
    }, 800);
  }

  function setSaved(id, on) {
    const idx = store.saved.indexOf(id);
    store.saved = store.saved.filter((x) => x !== id);
    if (on) store.saved.unshift(id);
    else if (idx >= 0) unsaved(id, idx);
  }
  // Подборка состоит только из лайкнутых объявлений (решение Katya 26.11):
  // сняли сердце — объявление уходит из Избранного и из всех подборок, снек 5 с с «Вернуть».
  const UNDO_SEC = 5;
  function unsaved(id, savedIdx) {
    const hits = store.podborki.filter((p) => p.items.includes(id)).map((p) => [p, p.items.indexOf(id)]);
    if (!hits.length) return;
    hits.forEach(([p]) => (p.items = p.items.filter((x) => x !== id)));
    const top = stack[stack.length - 1] || {};
    const here = top.type === "podborka" && hits.find(([p]) => p.id === top.id);
    const name = (here || hits[0])[0].name;
    const redraw = () => {
      if (tab === "fav" || tab === "home") rerender();
      else syncResultHearts();
    };
    setTimeout(redraw, 250);
    toast(`Вы удалили из подборки «${name}»`, {
      label: "Вернуть",
      run: () => {
        clearInterval(toast.tick);
        hits.forEach(([p, i]) => p.items.includes(id) || p.items.splice(i, 0, id));
        if (!store.saved.includes(id)) store.saved.splice(Math.min(savedIdx, store.saved.length), 0, id);
        if (cardEl && cardStack[cardStack.length - 1] === id)
          cardEl.querySelectorAll('[data-cd="fav"]').forEach((h) => {
            h.classList.add("is-active");
            h.innerHTML = App.ICONS.heartFilled20;
          });
        redraw();
      },
    }, UNDO_SEC);
  }
  function addViewed(id) {
    store.viewed = [id].concat(store.viewed.filter((x) => x !== id));
  }

  const CI = {
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V3.5m0 0L7.5 8M12 3.5 16.5 8M5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    layout: '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z M4 13h7M11 4v5M15 13v7M15 16h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M6 13v7M12 8v12M18 4v16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    walk: '<svg viewBox="0 0 24 24"><circle cx="13" cy="4" r="2" fill="currentColor"/><path d="M10 21l2-6 3 3v3M8 12l2-4 4 1 2 4M11 8l-1 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bus: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="15" rx="3" fill="currentColor"/><rect x="7" y="6" width="10" height="5" rx="1" fill="#fff"/><path d="M7 18v2.5M17 18v2.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6.6 3.5c.5-.5 1.3-.5 1.8 0l2.2 2.3c.5.5.5 1.2.1 1.7l-1.3 1.6c-.3.4-.3.9 0 1.3a14 14 0 0 0 4.2 4.2c.4.3.9.3 1.3 0l1.6-1.3c.5-.4 1.2-.4 1.7.1l2.3 2.2c.5.5.5 1.3 0 1.8l-1.2 1.3c-.9.9-2.2 1.3-3.4.9C10 17.8 6.2 14 4.4 8.6c-.4-1.2 0-2.5.9-3.4l1.3-1.7Z"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3.5c-5 0-9 3.4-9 7.6 0 2.3 1.2 4.3 3 5.7l-.5 3.4c-.1.5.5.9.9.6l3.4-2c.7.1 1.4.2 2.2.2 5 0 9-3.4 9-7.6S17 3.5 12 3.5Z"/><circle cx="8" cy="11" r="1.3" fill="#fff"/><circle cx="12" cy="11" r="1.3" fill="#fff"/><circle cx="16" cy="11" r="1.3" fill="#fff"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path fill="#FF8A00" d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z"/></svg>',
    cianMark: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 4 4 20h5.5L20 9.5zM20 12.5 12.5 20H20z"/></svg>',
    superStar: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/><path fill="#fff" d="m12 6.5 1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z"/></svg>',
    pencil: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="m14.5 5.5 4 4L9 19H5v-4zM16 4l1.3-1.3a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2L20 8z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><path fill="currentColor" d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6z"/></svg>',
    bank: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3 3 8v2h18V8zM5 11h2.5v6H5zm5.75 0h2.5v6h-2.5zM16.5 11H19v6h-2.5zM3 18.5h18V21H3z"/></svg>',
    brick: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 5h7v15H4zM12.5 10H20v10h-7.5z"/><path fill="#E6F0FF" d="M6 8h1.5v1.5H6zM6 12h1.5v1.5H6zM8.5 8H10v1.5H8.5zM8.5 12H10v1.5H8.5z"/></svg>',
    crane: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M5 4h14v2.5h-6V20H10V6.5H5z M15 8h2.5v4H15z"/></svg>',
    balcony: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 3h8v6H8zM3 11h18v2.5H3zM4.5 14h2v6h-2zm4.3 0h2v6h-2zm4.4 0h2v6h-2zm4.3 0h2v6h-2z"/></svg>',
    window: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 3h16v18H4z"/><path fill="#E6F0FF" d="M6.5 5.5h5v5h-5zm6.5 0h4.5v5H13zm-6.5 7h5v6h-5z"/></svg>',
    wheel: '<svg viewBox="0 0 24 24"><circle cx="10" cy="4.5" r="2" fill="currentColor"/><path d="M10 8v6h5l2 5M10 11h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 12.5a5 5 0 1 0 6.5 6.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    ramp: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 18 18 8h3v10z"/></svg>',
    lift: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="m12 3 5 6H7zM12 21l-5-6h10z"/></svg>',
    platform: '<svg viewBox="0 0 24 24"><path d="M7 4v14h11M7 11h6l2 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    history: '<svg viewBox="0 0 48 48"><rect x="6" y="20" width="9" height="20" rx="2" fill="#1A73FF"/><rect x="18" y="14" width="9" height="26" rx="2" fill="#FF6A4D"/><rect x="30" y="6" width="9" height="34" rx="2" fill="#1A73FF"/><path d="M4 36c8-2 12-12 20-12s10 4 20-8" fill="none" stroke="#21D07A" stroke-width="3" stroke-linecap="round"/></svg>',
  };

  const nf = (n) => n.toLocaleString("ru-RU").replace(/[ ,]/g, " ");
  const area = (n) => String(n).replace(".", ",");
  const roomsShort = (l) => (l.rooms ? `${l.rooms}-комн` : "Студия");

  function sellerOf(l) {
    const name = l.agency || "Собственник";
    const role = l.isByHomeowner ? "Собственник" : l.isSuperAgent ? "Суперагент" : l.isAgency ? "Агентство" : "Агент";
    const rating = (4 + ((parseInt(l.id, 10) % 9) + 1) / 10).toFixed(1).replace(".", ",");
    const reviews = 12 + (parseInt(l.id, 10) % 60);
    return { name, role, rating, reviews, avatar: l.avatar };
  }
  function avatarHtml(s, cls) {
    return s.avatar
      ? `<span class="${cls}" style="background-image:url('${encodeURI(s.avatar)}')"></span>`
      : `<span class="${cls} ${cls}--initials">${esc(s.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join(""))}</span>`;
  }
  function kvHtml(title, rows, more = true) {
    return `<section class="fw-cd__sec"><h2 class="fw-cd__h">${title}</h2>
      <dl class="fw-cd__kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
      ${more ? '<button class="fw-cd__link" type="button" data-cd="soon">Смотреть всё</button>' : ""}</section>`;
  }
  function heartBtn(id, cls) {
    const on = store.saved.includes(id);
    return `<button class="n4__btn n4__fav ${cls}${on ? " is-active" : ""}" type="button" data-cd="fav" aria-label="В избранное">${on ? App.ICONS.heartFilled20 : App.ICONS.heart20}</button>`;
  }

  function similarFor(l) {
    const pool = App.LISTINGS.filter((x) => x.id !== l.id && x.dealType === l.dealType && x.propertyType === l.propertyType && withPhoto(x));
    const near = pool.filter((x) => x.rooms === l.rooms);
    return near.concat(pool.filter((x) => !near.includes(x))).slice(0, 4);
  }
  function similarHtml(x) {
    const params = [x.rooms ? `${x.rooms}-комн. кв.` : "Студия", `${area(x.area)} м²`].join(" · ");
    const walk = x.metroTransport === "walk";
    return `<button class="fw-cd__sim" type="button" data-open="${x.id}">
      <span class="fw-cd__sim-photo" style="background-image:url('${photo(x.id)}')"></span>
      <span class="fw-cd__sim-price">${priceStr(x)}</span>
      <span class="fw-cd__sim-params">${params}</span>
      ${x.metro ? `<span class="fw-cd__metro"><i style="color:#${x.metroColor || "0468FF"}">M</i>${esc(x.metro)}</span>` : ""}
      ${x.metroMin ? `<span class="fw-cd__sim-min">${walk ? CI.walk : CI.bus}${x.metroMin} мин</span>` : ""}
    </button>`;
  }

  function cardHtml(l) {
    const s = sellerOf(l);
    const rent = l.dealType !== "sale";
    const photos = l.photos;
    const layoutIdx = photos.findIndex((p, i) => p.layout || (l.hasLayout && i === 1 && !photos.some((x) => x.layout)));
    const walk = l.metroTransport === "walk";
    const offer = Math.round((l.price * 0.97) / (rent ? 1000 : 100000)) * (rent ? 1000 : 100000);
    const perSqm = Math.round(l.price / l.area);
    const floors = l.floorsTotal ? `${l.floor} из ${l.floorsTotal}` : `${l.floor}`;
    const address = l.address || [l.street, l.house].filter(Boolean).join(", ") || l.fullAddress || "Санкт-Петербург";
    const year = 1995 + (parseInt(l.id, 10) % 28);
    const sub = rent
      ? `Залог ${l.deposit ? nf(l.deposit) + " ₽" : "без залога"} · ${l.clientFee ? "комиссия " + l.clientFee + "%" : "без комиссии"}`
      : `${nf(perSqm)} ₽/м²`;
    const verb = rent ? "сдаёт" : "продаёт";
    const feats = [
      [CI.person, l.isByHomeowner ? "Сдаёт собственник" : "1 собственник"],
      [CI.bank, rent ? "Договор аренды" : "Без обременений"],
      [CI.brick, "Монолитно-кирпичный"],
      [CI.crane, `${year} год постройки`],
      [CI.balcony, "1 лоджия"],
      [CI.window, "Окна во двор"],
    ];
    const access = [
      [CI.wheel, "Вход в подъезд без порога"],
      [CI.wheel, "Вход в квартиру без порога"],
      [CI.ramp, "Есть пандус"],
      [CI.platform, "Есть подъёмная платформа"],
      [CI.lift, "Есть лифт от 90 см"],
    ];
    const descr = `${rent ? "Сдаётся" : "Продаётся"} ${l.rooms ? `светлая ${l.rooms}-комнатная квартира` : "светлая студия"} ${area(l.area)} м² на ${l.floor} этаже${
      l.metro ? `, ${l.metroMin} минут ${walk ? "пешком" : "на транспорте"} до метро «${l.metro}»` : ""
    }.`;

    return `<div class="fw-cd__scroll">
      <div class="fw-cd__head">
        <button class="fw-cd__icon" type="button" data-cd="back" aria-label="Назад">${IC.back}</button>
        <span class="fw-cd__head-right">
          <button class="fw-cd__icon" type="button" data-cd="soon" aria-label="Поделиться">${CI.share}</button>
          ${heartBtn(l.id, "fw-cd__head-fav")}
          <button class="fw-cd__icon" type="button" data-cd="soon" aria-label="Ещё">${IC.more}</button>
        </span>
      </div>
      <div class="fw-cd__main">
        <div class="fw-cd__gallery">
          <div class="fw-cd__track">${photos.map((p) => `<div class="fw-cd__slide"><img src="${encodeURI(p.src)}" alt="" loading="lazy" /></div>`).join("")}</div>
          ${layoutIdx > -1 ? `<button class="fw-cd__layout" type="button" data-cd="layout" data-idx="${layoutIdx}">${CI.layout}Планировка</button>` : ""}
          <span class="fw-cd__counter">1 из ${photos.length}</span>
        </div>

        <div class="fw-cd__badges">
          <span class="fw-cd__badge fw-cd__badge--cian">${CI.cianMark}Только на Циане</span>
          ${l.isSuperAgent ? `<span class="fw-cd__badge fw-cd__badge--super">${CI.superStar}Суперагент</span>` : ""}
        </div>
        <div class="fw-cd__lead">${rent ? "Можно въехать сразу" : "Готова к сделке"}${l.metroMin ? `, ${l.metroMin} минут до метро` : ""}</div>
        <div class="fw-cd__price-row">
          <div>
            <div class="fw-cd__price">${priceStr(l)} <button class="fw-cd__chart" type="button" data-cd="soon" aria-label="История цены">${CI.chart}</button></div>
            <div class="fw-cd__sub">${sub}</div>
          </div>
          ${heartBtn(l.id, "fw-cd__round-fav")}
        </div>

        <label class="fw-cd__offer"><span>Предложите свою цену</span>
          <span class="fw-cd__offer-row"><input type="text" inputmode="numeric" placeholder="Например, ${nf(offer)} ₽" /><button type="button" data-cd="offer" aria-label="Отправить">${CI.arrow}</button></span>
        </label>

        <div class="fw-cd__params">
          <div><b>${roomsShort(l)}</b><span>${l.isApartments ? "апартаменты" : "квартира"}</span></div>
          <div><b>${area(l.area)} м²</b><span>общая пл</span></div>
          <div><b>${floors}</b><span>этаж</span></div>
        </div>

        <div class="fw-cd__addr">
          ${l.jk ? `<button class="fw-cd__jk" type="button" data-cd="soon">${esc(l.jk)}</button>` : ""}
          <div>${esc(address)}, Санкт-Петербург <span class="fw-cd__copy">${CI.copy}</span></div>
          ${l.metro ? `<div class="fw-cd__metro"><i style="color:#${l.metroColor || "0468FF"}">M</i>${esc(l.metro)} <span class="fw-cd__min">${walk ? CI.walk : CI.bus}${l.metroMin} мин</span></div>` : ""}
          <button class="fw-cd__link" type="button" data-cd="soon">Смотреть на карте</button>
        </div>

        <section class="fw-cd__sec"><h2 class="fw-cd__h">О квартире</h2>
          <div class="fw-cd__feats">${feats.map(([ic, t]) => `<div class="fw-cd__feat"><span>${ic}</span>${t}</div>`).join("")}</div>
        </section>

        <div class="fw-cd__agent">
          <div class="fw-cd__agent-title">Обсудите условия с ${l.isByHomeowner ? "собственником" : "агентом"}</div>
          <div class="fw-cd__agent-card">
            <div class="fw-cd__agent-top">
              ${avatarHtml(s, "fw-cd__ava")}
              <div class="fw-cd__agent-name"><b>${esc(s.name)}</b><span>${CI.star}<em>${s.rating}</em> ${s.reviews} ${plural(s.reviews, ["отзыв", "отзыва", "отзывов"])}</span></div>
              <button class="fw-cd__call" type="button" data-cd="soon" aria-label="Позвонить">${CI.phone}</button>
            </div>
            <div class="fw-cd__online">Начните чат, пока он <span>в сети</span></div>
            <div class="fw-cd__chips">${["Свяжитесь со мной", rent ? "Ещё сдаёте?" : "Ещё продаёте?", "Могу посмотреть?"].map((t) => `<button type="button" data-cd="soon">${t}</button>`).join("")}</div>
          </div>
        </div>

        <div class="fw-cd__meta">Обновлено: сегодня в 09:09<br />${nf(1200 + (parseInt(l.id, 10) % 7000))} просмотров, ${40 + (parseInt(l.id, 10) % 160)} за сегодня<br /><span>Топ + 990 ₽</span></div>

        <section class="fw-cd__sec"><h2 class="fw-cd__h">Описание</h2>
          <p class="fw-cd__descr">${esc(descr)}</p>
          <p class="fw-cd__descr fw-cd__descr--clip">Квартира после ремонта, в хорошем состоянии, остаётся мебель и техника. Рядом парк, школы и магазины.</p>
          <button class="fw-cd__link" type="button" data-cd="soon">Читать всё</button>
        </section>

        ${kvHtml("Общая информация", [
          ["Общая площадь", `${area(l.area)} м²`],
          ["Площадь комнат", `${area(Math.round(l.area * 0.5 * 10) / 10)} м²`],
          ["Высота потолков", "2,8 м"],
          ["Балкон/лоджия", "1 лоджия"],
          [rent ? "Мебель" : "Продаётся с мебелью", "Да"],
        ])}
        ${kvHtml("Юридические особенности", [
          ["Собственники до 18 лет", "Нет"],
          [rent ? "Договор" : "Материнский капитал при покупке", rent ? "Долгосрочный" : "Не использовался"],
        ], false)}
        ${kvHtml("Проверено в Росреестре", [
          ["Обременения", "Нет"],
          ["Собственников", "1"],
          ["Площадь", `${area(l.area)} м²`],
          ["Кадастровый номер", "78:14:0007612:***"],
          ["Этаж", String(l.floor)],
        ], false)}
        ${kvHtml("О доме", [
          ["Год постройки", String(year)],
          ["Тип дома", "Монолитно-кирпичный"],
          ["Этажей в доме", String(l.floorsTotal || "")],
          ["Лифт", "2 пасс. 1 груз."],
          ["Парковка", "Подземная"],
        ])}

        <button class="fw-cd__history" type="button" data-cd="soon"><span class="fw-cd__history-ic">${CI.history}</span><span><b>История объявлений</b><span>В этом и соседних домах</span></span>${CI.chevron}</button>

        <section class="fw-cd__sec"><h2 class="fw-cd__h">Доступная среда</h2>
          <div class="fw-cd__access">${access.map(([ic, t]) => `<div><span>${ic}</span>${t}</div>`).join("")}</div>
          <button class="fw-cd__link" type="button" data-cd="soon">Смотреть всё</button>
        </section>

        <div class="fw-cd__seller">
          ${avatarHtml(s, "fw-cd__ava fw-cd__ava--lg")}
          <div class="fw-cd__seller-body">
            <span class="fw-cd__seller-role">Объект ${verb}</span>
            <b>${esc(s.name)}</b>
            <span class="fw-cd__seller-rate">${CI.star}<em>${s.rating}</em> ${s.reviews} ${plural(s.reviews, ["отзыв", "отзыва", "отзывов"])}</span>
            ${l.isSuperAgent ? `<span class="fw-cd__badge fw-cd__badge--super">${CI.superStar}Суперагент</span>` : ""}
          </div>
          <button class="fw-btn fw-btn--light fw-cd__contacts" type="button" data-cd="soon">Посмотреть контакты</button>
        </div>

        <button class="fw-cd__note" type="button" data-cd="soon"><span>${CI.pencil}Заметка</span><em>Добавить</em></button>
        <button class="fw-cd__report" type="button" data-cd="soon">Пожаловаться на объявление</button>
      </div>

      <section class="fw-cd__similar">
        <h2 class="fw-cd__h">Похожие объявления</h2>
        <div class="fw-cd__sim-grid">${similarFor(l).map(similarHtml).join("")}</div>
      </section>
    </div>
    <div class="fw-cd__bottom">
      <div class="fw-cd__actions">
        <button class="fw-cd__cta" type="button" data-cd="soon">${CI.phone}Позвонить</button>
        <button class="fw-cd__cta" type="button" data-cd="soon">${CI.chat}Написать</button>
      </div>
      <div class="fw-cd__online-note"><i></i>Напишите, пока пользователь в сети</div>
    </div>`;
  }

  const cardStack = [];
  let cardEl;
  function openCard(id) {
    const l = byId(id);
    if (!l || !withPhoto(l)) return;
    addViewed(id);
    cardStack.push(id);
    renderCard(true);
  }
  function renderCard(isNew) {
    const id = cardStack[cardStack.length - 1];
    if (!id) {
      closeCards();
      return;
    }
    if (!cardEl) {
      cardEl = document.createElement("div");
      cardEl.className = "fw-cd";
      cardEl.addEventListener("click", onCardClick);
      $(".app").appendChild(cardEl);
    }
    cardEl.innerHTML = cardHtml(byId(id));
    document.body.classList.add("fw-card-open");
    if (isNew) {
      cardEl.classList.remove("is-in");
      void cardEl.offsetWidth;
      cardEl.classList.add("is-in");
    }
    const track = $(".fw-cd__track", cardEl);
    const counter = $(".fw-cd__counter", cardEl);
    track.addEventListener(
      "scroll",
      () => {
        const w = track.firstElementChild ? track.firstElementChild.offsetWidth + 8 : 1;
        counter.textContent = `${Math.min(track.children.length, Math.round(track.scrollLeft / w) + 1)} из ${track.children.length}`;
      },
      { passive: true }
    );
  }
  function closeCards() {
    cardStack.length = 0;
    document.body.classList.remove("fw-card-open");
    if (cardEl) cardEl.innerHTML = "";
    // Сердца и плитки — по свежему состоянию
    syncResultHearts();
    document.querySelectorAll(".fw-root .card[data-listing-id]").forEach(syncCardHeart);
    if (tab === "fav") rerender();
  }
  function onCardClick(e) {
    const open = e.target.closest("[data-open]");
    if (open) {
      openCard(open.dataset.open);
      return;
    }
    const b = e.target.closest("[data-cd]");
    if (!b) return;
    const a = b.dataset.cd;
    const id = cardStack[cardStack.length - 1];
    if (a === "back") {
      cardStack.pop();
      if (cardStack.length) renderCard(false);
      else closeCards();
    } else if (a === "fav") {
      const on = !store.saved.includes(id);
      setSaved(id, on);
      cardEl.querySelectorAll('[data-cd="fav"]').forEach((h) => {
        h.classList.toggle("is-active", on);
        h.innerHTML = on ? App.ICONS.heartFilled20 : App.ICONS.heart20;
        if (on) favCharge(h);
      });
      if (on) notifySaved(id);
    } else if (a === "layout") {
      const track = $(".fw-cd__track", cardEl);
      const slide = track.children[+b.dataset.idx];
      if (slide) track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: "smooth" });
    } else if (a === "offer") toast("Предложение цены в прототипе не отправляется");
    else toast("В прототипе это не работает");
  }

  // Тап по сниппету (не по кнопкам) — открыть карточку вместо заглушки выдачи
  const CARD_CONTROLS = ".card__btn, .card__gallery-btn, .card__gallery-badge, .card__labels, .n2__control, .n3__control, .asis__extra, .n4__btn, button, a";
  document.addEventListener(
    "click",
    (e) => {
      const card = e.target.closest(".card[data-listing-id]");
      if (card && !e.target.closest(CARD_CONTROLS)) {
        const trackEl = card.querySelector('[data-role="track"]');
        if (trackEl && trackEl.dataset.justDragged) return;
        e.stopPropagation();
        openCard(card.dataset.listingId);
        return;
      }
      const mini = e.target.closest(".fw-mini");
      if (mini && !e.target.closest(".fw-mini__heart")) {
        e.stopPropagation();
        openCard(mini.dataset.id);
      }
    },
    true
  );

  // API для модуля совместных подборок (together.js)
  window.FW = {
    App, store, stack, IC, ASSETS, $, esc, plural, priceStr, byId, photo, withPhoto, collageHtml, emptyStateHtml, EMPTY, RENT,
    push, rerender, toast, setTab, notifySaved, closeCards, openCard, favCharge, setSaved, syncCardHeart, CI,
    get tab() { return tab; },
    get root() { return root; },
  };

  function buildVariantSwitch() {
    const cur = App.session.variant;
    const bar = document.createElement("div");
    bar.className = "fw-variants";
    bar.innerHTML = `<span>Сниппет</span>${VARIANTS.map(([v, l]) => `<button type="button" data-v="${v}" class="${v === cur ? "is-on" : ""}">${l}</button>`).join("")}`;
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-v]");
      if (!b || b.dataset.v === App.session.variant) return;
      const url = new URL(location.href);
      url.searchParams.set("variant", b.dataset.v);
      location.href = url.toString();
    });
    document.body.appendChild(bar);
  }

  // У посуточной аренды нет кнопок «Позвонить» и «Написать» (Katya 27.11) — помечаем такие сниппеты в любом варианте
  function markDaily() {
    document.querySelectorAll(".card[data-listing-id]:not([data-fw-deal])").forEach((c) => {
      const l = byId(c.dataset.listingId);
      c.dataset.fwDeal = (l && l.dealType) || "x";
    });
  }
  new MutationObserver(markDaily).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("fw");
    buildVariantSwitch();
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
