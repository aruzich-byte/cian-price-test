/* Совместные подборки — этап 2 (макеты Katya, сверено с проектом Ани).
   Создание подборки (по 2B Ани): название, обложка, «Создать и позвать» / «Просто создать».
   Экран подборки одинаковый у создателя и приглашённого: синяя шапка, участники (создатель
   первым) и «+», карта с каруселью, шторка «N вариантов» со сниппетами new4.
   У посуточной — чип «даты · гости», по тапу их можно поменять.
   Приглашение в приложении (Дима): «Присоединиться» → подборка, крестик и «Не сейчас» → Главная.
   Оценки и «Совпало» — следующим шагом, по макету Katya. */
(function () {
  const FW = window.FW;
  if (!FW) return;
  const { App, store, stack, IC, ASSETS, $, esc, plural, priceStr, byId, photo, withPhoto } = FW;

  const PEOPLE = {
    anya: { name: "Аня", img: ASSETS + "together/anya.jpg" },
    dima: { name: "Дима", img: ASSETS + "together/dima.jpg" },
  };
  store.me = "anya";
  store.pendingInvite = null;

  const DATES = [
    { short: "22 — 24 нояб.", long: "22 — 24 ноября" },
    { short: "29 нояб. — 1 дек.", long: "29 ноября — 1 декабря" },
    { short: "6 — 8 дек.", long: "6 — 8 декабря" },
  ];
  const CITY = "Санкт-Петербург";
  const variants = (n) => `${n} ${plural(n, ["вариант", "варианта", "вариантов"])}`;

  const TI = {
    sort: '<svg viewBox="0 0 24 24"><path d="M7 20V4m0 0L3 8m4-4 4 4M17 4v16m0 0-4-4m4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    minus: '<svg viewBox="0 0 24 24"><path d="M6 12h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  };

  // ---------- Данные ----------
  const DAILY = App.LISTINGS.filter((l) => l.dealType === "daily" && l.propertyType === "flat" && withPhoto(l));
  const PRESET_ID = "p-spb";
  function presetPodborka() {
    let p = store.podborki.find((x) => x.id === PRESET_ID);
    if (!p) {
      const items = DAILY.filter((l) => l.rating).slice(0, 10).map((l) => l.id);
      p = { id: PRESET_ID, name: "Выходные в СПб", items, cover: items[0], type: "daily", dates: 0, guests: 2, members: ["anya"], creator: "anya", sort: "added" };
      store.podborki.unshift(p);
    }
    return p;
  }
  const dealNow = () => {
    const c = document.querySelector('[data-proto-param="deal"] .is-active');
    return c ? c.dataset.value : "rent";
  };
  const ensure = (p) => {
    p.members = p.members || [p.creator || "anya"];
    p.creator = p.creator || p.members[0];
    p.type = p.type || "long";
    p.sort = p.sort || "added";
    return p;
  };

  function sorter(src) {
    const p = store.podborki.find((x) => "podborka:" + x.id === src);
    if (!p || p.sort !== "price") return () => 0;
    return (a, b) => byId(a).price - byId(b).price;
  }
  const orderedItems = (p) => p.items.slice().sort(sorter("podborka:" + p.id));

  // ---------- Части экрана ----------
  function avatars(p) {
    const list = [p.creator].concat(p.members.filter((m) => m !== p.creator));
    return list.map((m) => `<img class="fw-av" src="${PEOPLE[m].img}" alt="${PEOPLE[m].name}" />`).join("");
  }
  function mapCardHtml(l) {
    const params = [l.rooms ? `${l.rooms}-комн. кв.` : "Студия", `${String(l.area).replace(".", ",")} м²`, `${l.floor}/${l.floorsTotal} эт.`].join(" · ");
    const on = store.saved.includes(l.id);
    const host = l.isSuperHost || l.isSuperAgent;
    const addr = [l.street, l.house].filter(Boolean).join(", ");
    const dots = Math.min(5, l.photos.length);
    return `<div class="fw-mc" data-open-card="${l.id}">
      <div class="fw-mc__photo" style="background-image:url('${photo(l.id)}')">
        ${host ? `<span class="fw-mc__badge">${l.dealType === "daily" ? "Суперхозяин" : "Суперагент"}</span>` : ""}
        <span class="fw-mc__fav-wrap"><button class="n4__btn n4__fav fw-mc__fav${on ? " is-active" : ""}" type="button" data-tg="fav" data-id="${l.id}" aria-label="В избранное">${on ? App.ICONS.heartFilled20 : App.ICONS.heart20}</button></span>
        <span class="fw-mc__dots">${Array.from({ length: dots }, (_, i) => `<i${i === 0 ? ' class="is-on"' : ""}></i>`).join("")}</span>
      </div>
      <div class="fw-mc__body">
        <div class="fw-mc__price">${priceStr(l)}</div>
        <div class="fw-mc__params">${params}</div>
        ${l.rating ? `<div class="fw-mc__rate"><span>★</span> ${esc(l.rating)} <em>·</em> ${esc(l.reviews || "")}</div>` : ""}
        ${addr ? `<div class="fw-mc__addr">${esc(addr)}</div>` : ""}
        ${l.metro ? `<div class="fw-mc__metro"><i style="color:#${l.metroColor || "0468FF"}">M</i>${esc(l.metro)}<span>${l.metroMin ? l.metroMin + " мин." : ""}</span></div>` : ""}
      </div>
    </div>`;
  }

  function screenPodborka(p) {
    ensure(p);
    const top = stack[stack.length - 1] || {};
    const items = orderedItems(p).map(byId).filter(Boolean);
    const empty = !items.length;
    const expanded = empty || top.expanded;
    const chip = p.type === "daily" ? `<button class="fw-pb__chip" type="button" data-tg="dates">${DATES[p.dates].short} · ${p.guests} ${plural(p.guests, ["гость", "гостя", "гостей"])}</button>` : "";
    return `<div class="fw-pb${expanded ? " is-expanded" : ""}">
      <div class="fw-pb__map"></div>
      <div class="fw-pb__head">
        <div class="fw-pb__bar">
          <button class="fw-pb__icon" type="button" data-act="back" aria-label="Назад">${IC.back}</button>
          <div class="fw-pb__title">${esc(p.name)}</div>
          <button class="fw-pb__icon" type="button" data-tg="more" aria-label="Ещё">${IC.more}</button>
        </div>
        <div class="fw-pb__row">
          ${chip}
          <button class="fw-pb__members" type="button" data-tg="share" aria-label="Позвать в подборку"><span class="fw-pb__avs">${avatars(p)}</span><span class="fw-pb__plus"><svg viewBox="0 0 12 12"><path d="M6 0v12M0 6h12" stroke="currentColor" stroke-width="2"/></svg></span></button>
        </div>
      </div>
      ${empty ? "" : `<div class="fw-pb__carousel">${items.map(mapCardHtml).join("")}</div>`}
      <div class="fw-pb__sheet">
        <button class="fw-pb__sheet-head" type="button" data-tg="toggle">
          <span class="fw-pb__handle"></span>
          <span class="fw-pb__count">${empty ? "Пока нет вариантов" : variants(items.length)}</span>
          ${empty ? "" : `<span class="fw-pb__sort" data-tg="sort" aria-label="Сортировка">${TI.sort}</span>`}
        </button>
        <div class="fw-scroll fw-pb__list">
          ${empty ? FW.emptyStateHtml(FW.EMPTY.newPodborka) : `<div class="fw-cards" data-cards="podborka:${p.id}"></div>`}
        </div>
      </div>
    </div>`;
  }

  function screenMain() {
    const p = store.pendingInvite && store.podborki.find((x) => x.id === store.pendingInvite);
    const inv = p
      ? `<button class="fw-main__invite" type="button" data-tg="reinvite">
          <img src="${ASSETS}together/couple.jpg" alt="" />
          <span><b>${PEOPLE[p.creator].name} зовёт выбирать квартиру вместе</b><span>${esc(p.name)} · ${variants(p.items.length)}</span></span>
        </button>`
      : "";
    return `<div class="fw-scroll fw-main">
      <div class="fw-main__title">Главная</div>
      <div class="fw-main__search">${TI.search}Город, адрес, метро, район</div>
      ${inv}
      <div class="fw-main__note">Главная в прототипе — заглушка</div>
    </div>`;
  }

  function after(root, top) {
    document.body.classList.toggle("fw-blue-top", FW.tab === "fav" && top.type === "podborka");
    if (FW.tab === "home") document.querySelectorAll(".fw-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === "home"));
  }

  // ---------- Шторки ----------
  function sheet(html, cls = "") {
    const wrap = document.createElement("div");
    wrap.className = "fw-sheet-wrap";
    wrap.innerHTML = `<div class="fw-sheet-backdrop"></div><div class="fw-sheet ${cls}"><div class="fw-sheet__handle"></div>${html}</div>`;
    $(".app").appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("is-open"));
    const close = () => {
      wrap.classList.remove("is-open");
      setTimeout(() => wrap.remove(), 250);
    };
    $(".fw-sheet-backdrop", wrap).addEventListener("click", close);
    return { wrap, close };
  }

  // 2B Ани: название с подсказками, обложка, «Выбирать вместе»
  function openCreate(listingId, dailyHint) {
    const daily = dailyHint !== undefined ? dailyHint : dealNow() === "daily";
    const names = daily ? ["Выходные в СПб", "Поездка с друзьями", "Отпуск"] : ["Квартира для нас", "Двушки у метро", "Рядом с работой"];
    const pool = (store.saved.length ? store.saved : (daily ? DAILY : FW.RENT).slice(0, 6).map((l) => l.id)).slice(0, 6);
    let cover = null;
    const { wrap, close } = sheet(`
      <div class="fw-sheet__title">Новая подборка</div>
      <label class="fw-field"><span>Название</span><input type="text" value="${esc(names[0])}" maxlength="40" /></label>
      <div class="fw-sugg">${names.map((n, i) => `<button class="fw-sugg__chip${i === 0 ? " is-on" : ""}" type="button" data-name="${esc(n)}">${esc(n)}</button>`).join("")}</div>
      <div class="fw-cover">
        <div class="fw-cover__label">Обложка</div>
        <div class="fw-cover__row">
          <button class="fw-cover__opt fw-cover__opt--auto is-on" type="button" data-cover="">Авто</button>
          ${pool.map((id) => `<button class="fw-cover__opt" type="button" data-cover="${id}" style="background-image:url('${photo(id)}')"></button>`).join("")}
        </div>
      </div>
      <div class="fw-together">
        <span class="fw-together__pair"><img class="fw-av" src="${PEOPLE[store.me].img}" alt="" /><span class="fw-av fw-av--plus">${IC.plus}</span></span>
        <span><b>Выбирать вместе</b><span>Позовите близкого и выбирайте варианты вдвоём, без чата</span></span>
      </div>
      <button class="fw-btn fw-btn--primary" type="button" data-create="together">Создать и позвать</button>
      <button class="fw-btn fw-btn--secondary" type="button" data-create="solo">Просто создать</button>`);
    const input = $("input", wrap);
    wrap.addEventListener("click", (e) => {
      const s = e.target.closest("[data-name]");
      if (s) {
        input.value = s.dataset.name;
        wrap.querySelectorAll("[data-name]").forEach((b) => b.classList.toggle("is-on", b === s));
        return;
      }
      const c = e.target.closest("[data-cover]");
      if (c) {
        cover = c.dataset.cover || null;
        wrap.querySelectorAll("[data-cover]").forEach((b) => b.classList.toggle("is-on", b === c));
        return;
      }
      const go = e.target.closest("[data-create]");
      if (!go) return;
      const p = ensure({ id: "p" + Date.now(), name: input.value.trim() || names[0], items: listingId ? [listingId] : [], cover, type: daily ? "daily" : "long", dates: 0, guests: 2, members: [store.me], creator: store.me });
      store.podborki.unshift(p);
      close();
      if (listingId && go.dataset.create === "solo") {
        FW.toast(`Подборка «${p.name}» создана`);
        if (FW.tab === "fav") FW.rerender();
        return;
      }
      if (listingId && document.body.classList.contains("fw-card-open")) FW.closeCards();
      stack.length = 0;
      stack.push({ type: "section", key: "podborki" });
      if (FW.tab !== "fav") FW.setTab("fav");
      FW.push({ type: "podborka", id: p.id });
      if (go.dataset.create === "together") setTimeout(() => openShare(p), 260);
      else FW.toast(`Подборка «${p.name}» создана`);
    });
  }

  // 2A Ани: «Сохранить в подборку» — список подборок, отметки, «Новая подборка»
  function openPick(id) {
    const l = byId(id);
    const daily = l && l.dealType === "daily";
    const picked = new Set();
    const rows = store.podborki
      .map((p) => {
        ensure(p);
        const has = p.items.includes(id);
        const cov = p.cover || p.items[0];
        const n = p.items.length;
        return `<button class="fw-pick__row" type="button" data-pick="${p.id}"${has ? " disabled" : ""}>
          <span class="fw-pick__thumb"${cov ? ` style="background-image:url('${photo(cov)}')"` : ""}></span>
          <span class="fw-pick__body"><b>${esc(p.name)}</b><span>${n} ${plural(n, ["объявление", "объявления", "объявлений"])}</span></span>
          ${p.members.length > 1 ? `<span class="fw-pick__avs">${avatars(p)}</span>` : ""}
          <span class="fw-pick__check${has ? " is-on" : ""}"></span>
        </button>`;
      })
      .join("");
    const { wrap, close } = sheet(`
      <div class="fw-sheet__title">Сохранить в подборку</div>
      <div class="fw-pick">
        ${rows}
        <button class="fw-pick__row" type="button" data-pick-new>
          <span class="fw-pick__thumb fw-pick__thumb--plus">${IC.plus}</span>
          <span class="fw-pick__body"><b>Новая подборка</b><span>Можно позвать близкого</span></span>
        </button>
      </div>
      <button class="fw-btn fw-btn--primary" type="button" data-pick-done>Готово</button>`);
    wrap.addEventListener("click", (e) => {
      const r = e.target.closest("[data-pick]");
      if (r) {
        const pid = r.dataset.pick;
        if (picked.has(pid)) picked.delete(pid);
        else picked.add(pid);
        $(".fw-pick__check", r).classList.toggle("is-on", picked.has(pid));
        return;
      }
      if (e.target.closest("[data-pick-new]")) {
        close();
        setTimeout(() => openCreate(id, daily), 260);
        return;
      }
      if (e.target.closest("[data-pick-done]")) {
        close();
        const list = store.podborki.filter((p) => picked.has(p.id));
        list.forEach((p) => p.items.unshift(id));
        if (list.length) FW.toast(`Добавлено в ${list.map((p) => `«${p.name}»`).join(", ")}`);
        if (FW.tab === "fav") FW.rerender();
      }
    });
  }

  // 3B Ани: одна ссылка, одно действие
  function openShare(p) {
    const items = p.items.length ? p.items.slice(0, 3) : p.cover ? [p.cover] : [];
    const me = PEOPLE[store.me].name;
    const { wrap, close } = sheet(`
      <div class="fw-sheet__title">Позвать в подборку</div>
      <div class="fw-share__preview">
        <span class="fw-share__thumb">${items.length ? FW.collageHtml(items) : `<img src="${ASSETS}together/couple.jpg" alt="" />`}</span>
        <span><b>${me} зовёт выбирать квартиру вместе</b><span>${esc(p.name)} · ${variants(p.items.length)}</span><span>cian.ru</span></span>
      </div>
      <div class="fw-share__apps">
        ${[["Telegram", "#2AABEE", "T"], ["WhatsApp", "#25D366", "W"], ["Сообщения", "#34C759", "✉"], ["Ещё", "#A0A8B6", "…"]]
          .map(([n, c, l]) => `<button class="fw-share__app" type="button" data-app="${n}"><span style="background:${c}">${l}</span>${n}</button>`)
          .join("")}
      </div>
      <button class="fw-share__copy" type="button" data-app="copy">${TI.link}Скопировать ссылку</button>
      <div class="fw-share__note">Ссылка работает для 4 человек</div>`);
    wrap.addEventListener("click", (e) => {
      const a = e.target.closest("[data-app]");
      if (!a) return;
      close();
      const txt = a.dataset.app === "copy" ? "Ссылка скопирована" : `Ссылка отправлена в ${a.dataset.app}`;
      FW.toast(txt, { label: "Глазами Димы", run: () => openInvite(p.id) });
    });
  }

  function openDates(p) {
    let d = p.dates, g = p.guests;
    const { wrap, close } = sheet(`
      <div class="fw-sheet__title">Даты и гости</div>
      <div class="fw-dates">${DATES.map((x, i) => `<button class="fw-sugg__chip${i === d ? " is-on" : ""}" type="button" data-d="${i}">${x.short}</button>`).join("")}</div>
      <div class="fw-guests"><span>Гости</span><span class="fw-guests__ctl"><button type="button" data-g="-1">${TI.minus}</button><b>${g}</b><button type="button" data-g="1">${IC.plus}</button></span></div>
      <div class="fw-dates__note">Даты и гости общие для всех участников подборки</div>
      <button class="fw-btn fw-btn--primary" type="button" data-ok>Применить</button>`);
    wrap.addEventListener("click", (e) => {
      const db = e.target.closest("[data-d]");
      if (db) {
        d = +db.dataset.d;
        wrap.querySelectorAll("[data-d]").forEach((b) => b.classList.toggle("is-on", b === db));
      }
      const gb = e.target.closest("[data-g]");
      if (gb) {
        g = Math.max(1, Math.min(8, g + +gb.dataset.g));
        $(".fw-guests__ctl b", wrap).textContent = g;
      }
      if (e.target.closest("[data-ok]")) {
        p.dates = d;
        p.guests = g;
        close();
        FW.rerender();
      }
    });
  }

  // ---------- Приглашение (экран Димы в приложении) ----------
  let inv;
  function openInvite(pid) {
    const p = ensure(pid ? store.podborki.find((x) => x.id === pid) || presetPodborka() : presetPodborka());
    const pins = p.items.slice(0, 3).map(byId);
    const POS = [
      [96, 144],
      [212, 50],
      [266, 226],
    ];
    const sub = p.type === "daily" ? `${DATES[p.dates].long} · ${CITY}` : `${esc(p.name)} · ${variants(p.items.length)}`;
    if (!inv) {
      inv = document.createElement("div");
      inv.className = "fw-inv";
      inv.addEventListener("click", onInviteClick);
      $(".app").appendChild(inv);
    }
    inv.dataset.pid = p.id;
    inv.innerHTML = `<div class="fw-inv__map">
        ${pins
          .map((l, i) => `<span class="fw-pin" style="top:${POS[i][0]}px;left:${POS[i][1]}px"><span class="fw-pin__img" style="background-image:url('${photo(l.id)}')"></span><span><b>${FW.priceStr(l).replace(/^от /, "").replace(/\/.*$/, "")}</b><span>${l.rooms ? `${l.rooms}-к.кв` : "Студия"} · ${String(l.area).replace(".", ",")} м²</span></span></span>`)
          .join("")}
      </div>
      <div class="fw-inv__sheet">
        <span class="fw-inv__cover"><img src="${ASSETS}together/couple.jpg" alt="" /></span>
        <button class="fw-inv__close" type="button" data-inv="later" aria-label="Закрыть">${TI.close}</button>
        <div class="fw-inv__title">${PEOPLE[p.creator].name} зовёт выбирать квартиру вместе</div>
        <div class="fw-inv__sub">${sub}</div>
        <button class="fw-btn fw-btn--primary" type="button" data-inv="join">Присоединиться</button>
        <button class="fw-btn fw-btn--secondary" type="button" data-inv="later">Не сейчас</button>
        <div class="fw-inv__consent">Нажимая «Присоединиться», вы соглашаетесь, что участники подборки увидят ваше имя и оценки</div>
      </div>`;
    document.body.classList.add("fw-inv-open");
    inv.classList.remove("is-in");
    void inv.offsetWidth;
    inv.classList.add("is-in");
  }
  function closeInvite() {
    document.body.classList.remove("fw-inv-open");
  }
  function onInviteClick(e) {
    const b = e.target.closest("[data-inv]");
    if (!b) return;
    const p = store.podborki.find((x) => x.id === inv.dataset.pid);
    closeInvite();
    if (b.dataset.inv === "join") {
      store.me = "dima";
      if (!p.members.includes("dima")) p.members.push("dima");
      store.pendingInvite = null;
      stack.length = 0;
      stack.push({ type: "section", key: "podborki" }, { type: "podborka", id: p.id });
      FW.setTab("fav");
      FW.toast(`Вы в подборке «${p.name}»`);
    } else {
      store.pendingInvite = p.id;
      FW.setTab("home");
    }
  }

  // ---------- События ----------
  function onClick(e) {
    const t = e.target.closest("[data-tg]");
    const top = stack[stack.length - 1] || {};
    const p = top.type === "podborka" && store.podborki.find((x) => x.id === top.id);
    if (t) {
      const a = t.dataset.tg;
      e.stopPropagation();
      if (a === "fav") {
        const id = t.dataset.id;
        const on = !store.saved.includes(id);
        FW.setSaved(id, on);
        t.classList.toggle("is-active", on);
        t.innerHTML = on ? App.ICONS.heartFilled20 : App.ICONS.heart20;
        if (on) FW.favCharge(t);
        if (on) FW.notifySaved(id);
        document.querySelectorAll(`.fw-root .card--n4[data-listing-id="${id}"]`).forEach(FW.syncCardHeart);
      } else if (a === "sort" && p) {
        p.sort = p.sort === "price" ? "added" : "price";
        FW.rerender();
        FW.toast(p.sort === "price" ? "Сначала дешевле" : "По дате добавления");
      } else if (a === "toggle") {
        top.expanded = !top.expanded;
        const pb = $(".fw-pb", FW.root);
        if (pb && p && p.items.length) pb.classList.toggle("is-expanded", top.expanded);
      } else if (a === "dates" && p) openDates(p);
      else if (a === "share" && p) openShare(p);
      else if (a === "reinvite") openInvite(store.pendingInvite);
      else FW.toast("В прототипе это не работает");
      return;
    }
    const mc = e.target.closest("[data-open-card]");
    if (mc) {
      e.stopPropagation();
      FW.openCard(mc.dataset.openCard);
    }
  }

  // ---------- Панель прототипа: сценарий «Вместе» ----------
  function buildPanel() {
    const panel = document.getElementById("prototype-panel");
    if (!panel) return;
    const sec = document.createElement("div");
    sec.className = "prototype-panel__section";
    sec.innerHTML = `<div class="prototype-panel__section-title">Сценарий «Вместе»</div>
      <div class="prototype-panel__chips">
        <button class="proto-chip" type="button" data-scene="anya">Аня: подборка «Выходные в СПб»</button>
        <button class="proto-chip" type="button" data-scene="dima">Дима: пришло приглашение</button>
      </div>`;
    sec.addEventListener("click", (e) => {
      const b = e.target.closest("[data-scene]");
      if (!b) return;
      e.stopPropagation();
      runScene(b.dataset.scene);
      const close = document.getElementById("prototype-panel-close");
      if (close && window.matchMedia("(max-width: 480px)").matches) close.click();
    });
    panel.appendChild(sec);
  }
  function runScene(s) {
    closeInvite();
    const p = presetPodborka();
    if (s === "dima") {
      openInvite(p.id);
      return;
    }
    store.me = "anya";
    stack.length = 0;
    stack.push({ type: "section", key: "podborki" }, { type: "podborka", id: p.id });
    FW.setTab("fav");
  }

  window.FWT = {
    screen: screenPodborka,
    screens: { main: screenMain },
    after,
    sorter,
    openCreate,
    openPick,
  };

  document.addEventListener("DOMContentLoaded", () => {
    // после fav.js: корень Избранного уже создан
    setTimeout(() => {
      if (FW.root) FW.root.addEventListener("click", onClick, true);
      buildPanel();
      const q = new URLSearchParams(location.search);
      if (q.get("scene")) runScene(q.get("scene"));
    }, 0);
  });
})();
