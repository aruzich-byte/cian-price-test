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
  // 2. Даты и гости посуточного поиска (как в Airbnb: вишлист запоминает даты поиска). В прототипе поиск без календаря — даты сценария
  const SEARCH = { dates: 0, guests: 2 };
  const variants = (n) => `${n} ${plural(n, ["вариант", "варианта", "вариантов"])}`;

  const CI_SWAP = '<svg viewBox="0 0 24 24"><path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
  // Карта — картинка из макета Katya (786×1704 при 2x). Привязка по Финляндскому
  // и Московскому вокзалам и Петропавловской крепости: px = 640 + 5316·(lon − 30.3561),
  // py = 622 − 9808·(lat − 59.9557).
  const MAP_W = 786, MAP_H = 1704;
  const mapXY = (l) => (l.lat && l.lon ? [640 + 5316 * (l.lon - 30.3561), 622 - 9808 * (l.lat - 59.9557)] : null);
  const onMap = (l) => {
    const xy = mapXY(l);
    return xy && xy[0] > 40 && xy[0] < MAP_W - 40 && xy[1] > 330 && xy[1] < 900;
  };
  const pinLabel = (l) => l.price.toLocaleString("ru-RU").replace(/[ ,]/g, " ") + " ₽";
  function pinsHtml(items) {
    return `<div class="fw-pins">${items
      .map((l) => {
        const xy = mapXY(l);
        if (!xy || xy[0] < 0 || xy[0] > MAP_W) return "";
        return `<button class="fw-mpin" type="button" data-tg="pin" data-id="${l.id}" style="left:${((xy[0] / MAP_W) * 100).toFixed(2)}%;top:${((xy[1] / MAP_H) * 100).toFixed(2)}%">${pinLabel(l)}</button>`;
      })
      .join("")}</div>`;
  }
  // ---------- Мои места (Katya 26.11): точки на карте подборки с картинкой и заметкой ----------
  const PLACE_KINDS = {
    pool: { label: "Бассейн", img: "place-pool.png", hint: "Сюда в бассейн пойдём в субботу вечером" },
    office: { label: "Офис", img: "place-office.png", hint: "Здесь в офис за документами заеду" },
    museum: { label: "Музей обезьян", img: "place-museum.png", hint: "В воскресенье сходим в музей обезьян" },
  };
  // Место хранит lat/lon (поставлено на живой карте) или x/y в % картинки (пресеты) — переводим одно в другое
  const placeGeo = (pl) => (pl.lat ? [pl.lat, pl.lon] : [59.9557 - ((pl.y / 100) * MAP_H - 622) / 9808, 30.3561 + ((pl.x / 100) * MAP_W - 640) / 5316]);
  const placeXY = (pl) => {
    if (pl.x !== undefined) return [pl.x, pl.y];
    const xy = mapXY({ lat: pl.lat, lon: pl.lon });
    return [+((xy[0] / MAP_W) * 100).toFixed(2), +((xy[1] / MAP_H) * 100).toFixed(2)];
  };
  function placesHtml(p) {
    return (p.places || [])
      .map((pl) => {
        const [x, y] = placeXY(pl);
        return `<button class="fw-place fw-place--${pl.kind}" type="button" data-tg="place" data-id="${pl.id}" style="left:${x}%;top:${y}%" aria-label="${PLACE_KINDS[pl.kind].label}"><img src="${ASSETS}together/${PLACE_KINDS[pl.kind].img}" alt="" /></button>`;
      })
      .join("");
  }

  // ---------- Живая карта подборки (Katya 27.11): Яндекс Карты, как на выдаче с картой ----------
  // Двигается и зумится. Пины, места, карусель и шторка работают как на картинке.
  // Если API карт не загрузился (нет сети), остаётся картинка с пинами — прототип не ломается.
  let live = null;
  let liveWait = false;
  function liveTop() {
    const t = stack[stack.length - 1] || {};
    return t.type === "podborka" ? t : null;
  }
  function mountLiveMap(root, top, p) {
    const box = $(".fw-pb__map", root);
    if (!box) return;
    if (typeof ymaps === "undefined" || !ymaps.ready) {
      const sc = document.getElementById("ymaps-script");
      if (sc && !liveWait) {
        liveWait = true;
        sc.addEventListener("load", () => liveTop() && FW.tab === "fav" && FW.rerender(), { once: true });
      }
      return;
    }
    ymaps.ready(() => {
      if (!box.isConnected) return;
      if (live) {
        try {
          live.map.destroy();
        } catch (e) {}
        live = null;
      }
      const el = document.createElement("div");
      el.className = "fw-ymap";
      box.appendChild(el);
      box.classList.add("is-live");
      const items = orderedItems(p).map(byId).filter((l) => l && l.lat && l.lon);
      const map = new ymaps.Map(el, { center: top.mapC || [59.94, 30.33], zoom: top.mapZ || 12, controls: [] }, { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true });
      live = { map, top, pid: p.id, placing: null };

      const PinL = ymaps.templateLayoutFactory.createClass('<button class="fw-mpin" type="button" data-id="$[properties.id]">$[properties.label]</button>', {
        build: function () {
          PinL.superclass.build.call(this);
          const b = this.getParentElement().querySelector(".fw-mpin");
          const t = liveTop();
          if (b && t && t.view === "card" && b.dataset.id === t.active) b.classList.add("is-active");
        },
      });
      const PlaceL = ymaps.templateLayoutFactory.createClass('<button class="fw-place fw-place--$[properties.kind]" type="button" aria-label="$[properties.title]"><img src="$[properties.img]" alt="" /></button>');

      const pins = new ymaps.GeoObjectCollection();
      items.forEach((l) => {
        const pm = new ymaps.Placemark([l.lat, l.lon], { id: l.id, label: pinLabel(l) }, {
          iconLayout: PinL,
          iconShape: { type: "Rectangle", coordinates: [[-46, -16], [46, 16]] },
        });
        pm.events.add("click", () => tapPin(l.id));
        pins.add(pm);
      });
      map.geoObjects.add(pins);
      (p.places || []).forEach((pl) => {
        const k = PLACE_KINDS[pl.kind];
        const round = pl.kind === "museum";
        const pm = new ymaps.Placemark(placeGeo(pl), { kind: pl.kind, title: k.label, img: ASSETS + "together/" + k.img }, {
          iconLayout: PlaceL,
          iconShape: { type: "Circle", coordinates: round ? [0, 0] : [0, -22], radius: round ? 26 : 30 },
          zIndex: 700,
        });
        pm.events.add("click", () => openNotes(p, pl.id, k.label));
        map.geoObjects.add(pm);
      });

      map.events.add("click", (e) => {
        const t = liveTop();
        if (live && live.placing) return live.placing(e.get("coords"));
        if (t && t.view === "card") setView(t.prev || "half");
      });
      map.events.add("boundschange", (e) => {
        top.mapC = e.get("newCenter");
        top.mapZ = e.get("newZoom");
      });
      // Первый показ: все квартиры подборки в видимой части (над полшторкой)
      if (!top.mapC && items.length) {
        const b = pins.getBounds();
        if (b) map.setBounds(b, { checkZoomRange: true, zoomMargin: [150, 40, 400, 40] }).then(() => {
          if (map.getZoom() > 15) map.setZoom(15);
        });
      }
    });
  }
  // пин → карусель с его карточкой, шторка сворачивается
  function tapPin(id) {
    const top = liveTop();
    if (!top) return;
    const fromHalf = top.view !== "card";
    if (fromHalf) top.prev = top.view || "half";
    top.active = id;
    setView("card");
    scrollToCard(id, !fromHalf);
  }

  function presetPodborka() {
    let p = store.podborki.find((x) => x.id === PRESET_ID);
    if (!p) {
      // сначала объявления, которые попадают на видимую часть карты
      const vis = DAILY.filter((l) => l.rating && onMap(l));
      const items = vis.concat(DAILY.filter((l) => l.rating && !vis.includes(l))).slice(0, 10).map((l) => l.id);
      p = { id: PRESET_ID, name: "Выходные в СПб", items, cover: items[0], type: "daily", dates: 0, guests: 2, members: ["anya"], creator: "anya", sort: "added" };
      const ago = (m) => Date.now() - m * 60000;
      p.notes = {
        [items[0]]: [
          { who: "anya", text: "Близко к метро, и вид из окна классный", ts: ago(180) },
          { who: "anya", text: "Есть кухня, можно не ходить в кафе по утрам", ts: ago(175) },
          { who: "anya", text: "Заселение с 14:00, успеем с поезда", ts: ago(170) },
        ],
        [items[1]]: [{ who: "anya", text: "Дороговато, но зато в центре", ts: ago(120) }],
      };
      p.reactions = { [items[0]]: { "👍": ["anya"] }, [items[2]]: { "👎": ["anya"] } };
      p.places = [
        { id: "pl-pool", kind: "pool", x: 19, y: 41, who: "anya" },
        { id: "pl-office", kind: "office", x: 86, y: 34, who: "anya" },
        { id: "pl-museum", kind: "museum", x: 56, y: 39, who: "anya" },
      ];
      p.notes["pl-pool"] = [{ who: "anya", text: "Сюда в бассейн пойдём в субботу вечером", ts: ago(240) }];
      p.notes["pl-museum"] = [{ who: "anya", text: "В воскресенье сходим в музей обезьян 🐒", ts: ago(230) }];
      p.notes["pl-office"] = [{ who: "anya", text: "Здесь в офис за документами заеду", ts: ago(235) }];
      store.podborki.unshift(p);
      // в подборке только лайкнутые — сердца внутри горят
      items.slice().reverse().forEach((id) => store.saved.includes(id) || store.saved.unshift(id));
    }
    return p;
  }
  const dealNow = () => {
    const c = document.querySelector('[data-proto-param="deal"] .is-active');
    return c ? c.dataset.value : "rent";
  };
  const ensure = (p) => {
    p.notes = p.notes || {};
    p.places = p.places || [];
    p.reactions = p.reactions || {};
    p.updated = p.updated || Date.now();
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
  // Сниппет на карте — по макету Katya «Card»: звонок и чат справа, внизу заметки и реакции
  const EMOJI = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"]; // вставка в текст заметки
  // Пасхалка (Katya 27.11): в заметках к первой квартире подборки вместо эмодзи можно отправить стикер
  // из набора «Цианыч» (t.me/addstickers/cianich). Файлы — img/stickers/, список — ниже.
  const STICKERS = window.FW_STICKERS || [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${ASSETS}stickers/cianich-${n}.webp`);
  const REACTIONS = ["🔥", "👍", "👎", "💩"]; // реакции: огонь/лайк/дизлайк/какашка (Katya 27.11), одна оценка на человека
  const notesWord = (n) => `${n} ${plural(n, ["заметка", "заметки", "заметок"])}`;
  function footHtml(p, id) {
    const notes = p.notes[id] || [];
    const who = [...new Set(notes.map((n) => n.who))];
    const reacts = Object.entries(p.reactions[id] || {}).filter(([, list]) => list.length);
    return `<div class="fw-mc__foot" data-foot="${id}">
      <button class="fw-mc__notes" type="button" data-tg="notes" data-id="${id}">
        ${who.length ? `<span class="fw-mc__avs">${who.map((m) => `<img class="fw-av" src="${PEOPLE[m].img}" alt="${PEOPLE[m].name}" />`).join("")}</span>` : ""}
        ${notes.length ? notesWord(notes.length) : "Добавить заметку"}
      </button>
      <span class="fw-mc__reacts">
        ${reacts.map(([e, list]) => `<button class="fw-react${list.includes(store.me) ? " is-mine" : ""}" type="button" data-tg="react" data-id="${id}" data-emoji="${e}">${e}<b>${list.length}</b></button>`).join("")}
        <button class="fw-react fw-react--add" type="button" data-tg="react-add" data-id="${id}" aria-label="Добавить реакцию"><img src="${ASSETS}together/add-reaction.svg" alt="" /></button>
      </span>
    </div>`;
  }
  function mapCardHtml(l, p) {
    const params = [l.rooms ? `${l.rooms}-комн. кв.` : "Студия", `${String(l.area).replace(".", ",")} м²`, `${l.floor}/${l.floorsTotal} эт.`].join(" · ");
    const on = store.saved.includes(l.id);
    const addr = [l.street, l.house].filter(Boolean).join(", ");
    const dots = Math.min(5, l.photos.length);
    return `<div class="fw-mc" data-open-card="${l.id}">
      <div class="fw-mc__photo" style="background-image:url('${photo(l.id)}')">
        <span class="fw-mc__fav-wrap"><button class="n4__btn n4__fav fw-mc__fav${on ? " is-active" : ""}" type="button" data-tg="fav" data-id="${l.id}" aria-label="В избранное">${on ? App.ICONS.heartFilled20 : App.ICONS.heart20}</button></span>
        <span class="fw-mc__dots">${Array.from({ length: dots }, (_, i) => `<i${i === 0 ? ' class="is-on"' : ""}></i>`).join("")}</span>
      </div>
      <div class="fw-mc__body">
        <div class="fw-mc__info">
          <div class="fw-mc__price">${priceStr(l)}</div>
          <div class="fw-mc__params">${params}</div>
          ${l.rating ? `<div class="fw-mc__rate"><span>★ ${esc(l.rating)}</span> · ${esc(l.reviews || "")}</div>` : ""}
          ${addr ? `<div class="fw-mc__addr">${esc(addr)}</div>` : ""}
          ${l.metro ? `<div class="fw-mc__metro"><i style="color:#${l.metroColor || "0468FF"}">M</i>${esc(l.metro)}<span>${l.metroMin ? l.metroMin + " мин." : ""}</span></div>` : ""}
        </div>
        ${l.dealType === "daily" ? "" : `<div class="fw-mc__acts">
          <button class="fw-mc__call" type="button" data-tg="call" aria-label="Позвонить">${FW.CI.phone}</button>
          <button class="fw-mc__chat" type="button" data-tg="chat" aria-label="Написать"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3.5c-5 0-9 3.4-9 7.6 0 2.3 1.2 4.3 3 5.7l-.5 3.4c-.1.5.5.9.9.6l3.4-2c.7.1 1.4.2 2.2.2 5 0 9-3.4 9-7.6S17 3.5 12 3.5Z"/><circle cx="8" cy="11" r="1.3" fill="#fff"/><circle cx="12" cy="11" r="1.3" fill="#fff"/><circle cx="16" cy="11" r="1.3" fill="#fff"/></svg></button>
        </div>`}
      </div>
      ${p ? footHtml(p, l.id) : ""}
    </div>`;
  }

  // ---------- Реакции и заметки ----------
  function toggleReaction(p, id, emoji) {
    const r = (p.reactions[id] = p.reactions[id] || {});
    const list = (r[emoji] = r[emoji] || []);
    const i = list.indexOf(store.me);
    if (i > -1) list.splice(i, 1);
    else {
      // одна оценка на человека: лайк снимает дизлайк и наоборот
      REACTIONS.forEach((e) => {
        if (e !== emoji && r[e]) r[e] = r[e].filter((m) => m !== store.me);
      });
      list.push(store.me);
    }
    p.updated = Date.now();
  }
  function refreshFoot(p, id) {
    document.querySelectorAll(`[data-foot="${id}"]`).forEach((f) => {
      if (f.classList.contains("fw-gc__foot")) return void (f.outerHTML = gridFootHtml(p, id));
      const n4 = f.classList.contains("fw-mc__foot--n4");
      f.outerHTML = footHtml(p, id).replace('class="fw-mc__foot"', `class="fw-mc__foot${n4 ? " fw-mc__foot--n4" : ""}"`);
    });
  }
  function openReactPicker(btn, p, id) {
    document.querySelectorAll(".fw-rpick").forEach((x) => x.remove());
    const pop = document.createElement("div");
    pop.className = "fw-rpick";
    pop.innerHTML = REACTIONS.map((e) => `<button type="button" data-e="${e}">${e}</button>`).join("");
    const app = $(".app");
    const a = app.getBoundingClientRect(), r = btn.getBoundingClientRect();
    const scale = a.width / app.offsetWidth || 1;
    pop.style.top = (r.top - a.top) / scale - 52 + "px";
    app.appendChild(pop);
    // бабл — над нажатой кнопкой, по центру неё, не вылезая за края экрана (Katya 27.11)
    const cx = (r.left + r.width / 2 - a.left) / scale;
    const w = pop.offsetWidth;
    pop.style.right = "auto";
    pop.style.left = Math.max(8, Math.min(app.offsetWidth - w - 8, cx - w / 2)) + "px";
    const off = (e) => {
      if (pop.contains(e.target)) return;
      pop.remove();
      document.removeEventListener("click", off, true);
    };
    setTimeout(() => document.addEventListener("click", off, true), 0);
    pop.addEventListener("click", (e) => {
      const b = e.target.closest("[data-e]");
      if (!b) return;
      toggleReaction(p, id, b.dataset.e);
      pop.remove();
      document.removeEventListener("click", off, true);
      refreshFoot(p, id);
    });
  }
  const timeAgo = (ts) => {
    const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
    return m < 60 ? `${m} мин.` : `${Math.round(m / 60)} ч.`;
  };
  // Шторка заметок — по структуре комментариев Instagram: заголовок, список, эмодзи над полем ввода
  function openNotes(p, id, title = "Заметки") {
    const noteBody = (n) => (n.sticker ? `<img class="fw-note__sticker" src="${n.sticker}" alt="Стикер" />` : `<div class="fw-note__text">${esc(n.text)}</div>`);
    const noteRow = (n) => `<div class="fw-note"><img class="fw-av" src="${PEOPLE[n.who].img}" alt="" /><div><div class="fw-note__who"><b>${PEOPLE[n.who].name}</b><span>${timeAgo(n.ts)}</span></div>${noteBody(n)}</div></div>`;
    const egg = STICKERS.length && byId(id) && orderedItems(p)[0] === id;
    const listHtml = () => {
      const notes = p.notes[id] || [];
      return notes.length
        ? notes.map(noteRow).join("")
        : `<div class="fw-notes__empty"><b>Пока нет заметок</b><span>Напишите, что думаете. Участники подборки увидят</span></div>`;
    };
    const { wrap } = sheet(`
      <div class="fw-notes__title">${esc(title)}</div>
      <div class="fw-notes__list">${listHtml()}</div>
      ${egg
        ? `<div class="fw-notes__emoji fw-notes__emoji--stk">${STICKERS.map((src) => `<button type="button" data-stk="${src}" aria-label="Стикер"><img src="${src}" alt="" /></button>`).join("")}</div>`
        : `<div class="fw-notes__emoji">${EMOJI.map((e) => `<button type="button" data-ins="${e}">${e}</button>`).join("")}</div>`}
      <div class="fw-notes__input">
        <img class="fw-av" src="${PEOPLE[store.me].img}" alt="" />
        <span class="fw-notes__field"><input type="text" placeholder="Что вы об этом думаете?" maxlength="200" /><button type="button" data-send aria-label="Отправить">${FW.CI.arrow}</button></span>
      </div>`, "fw-sheet--notes");
    const input = $("input", wrap);
    const field = $(".fw-notes__field", wrap);
    const list = $(".fw-notes__list", wrap);
    const sync = () => field.classList.toggle("has-text", !!input.value.trim());
    input.addEventListener("input", sync);
    const send = () => {
      const text = input.value.trim();
      if (!text) return;
      (p.notes[id] = p.notes[id] || []).push({ who: store.me, text, ts: Date.now() });
      p.updated = Date.now();
      input.value = "";
      sync();
      list.innerHTML = listHtml();
      list.scrollTop = list.scrollHeight;
      refreshFoot(p, id);
    };
    input.addEventListener("keydown", (e) => e.key === "Enter" && send());
    wrap.addEventListener("click", (e) => {
      const ins = e.target.closest("[data-ins]");
      if (ins) {
        input.value += ins.dataset.ins;
        sync();
        input.focus();
      }
      if (e.target.closest("[data-send]")) send();
      const stk = e.target.closest("[data-stk]");
      if (stk) {
        (p.notes[id] = p.notes[id] || []).push({ who: store.me, sticker: stk.dataset.stk, ts: Date.now() });
        p.updated = Date.now();
        list.innerHTML = listHtml();
        list.scrollTop = list.scrollHeight;
        refreshFoot(p, id);
      }
    });
  }

  function screenPodborka(p) {
    ensure(p);
    const top = stack[stack.length - 1] || {};
    const items = orderedItems(p).map(byId).filter(Boolean);
    if (PB_LIST) return screenPodborkaList(p, top, items);
    const empty = !items.length;
    // Состояния экрана (Katya 26.11): half — полкарты без выбранных пинов + полшторки списка (старт),
    // card — выбран пин: карусель карточек, шторка свёрнута; full — список на весь экран
    const view = empty ? "full" : top.view || "half";
    const expanded = view === "full";
    const chip = p.type === "daily" ? `<button class="fw-pb__chip" type="button" data-tg="dates">${DATES[p.dates].short} · ${p.guests} ${plural(p.guests, ["гость", "гостя", "гостей"])}</button>` : "";
    return `<div class="fw-pb${expanded ? " is-expanded" : ""} is-${view}">
      <div class="fw-pb__map" data-tg="map">${pinsHtml(items).replace(/<\/div>$/, placesHtml(p) + "</div>")}</div>
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
      ${empty ? "" : `<div class="fw-pb__carousel">${items.map((l) => mapCardHtml(l, p)).join("")}</div>`}
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

  // ---------- Версия 2 подборки: по умолчанию список 2 в ряд, карта — по кнопке (Katya 27.11, Figma 344:61022) ----------
  // Включается параметром ?pb=list. Шапка с фоном под синим градиентом, фон выбирается в настройках (карандаш).
  let PB_LIST = new URLSearchParams(location.search).get("pb") === "list";
  const BGS = ["fold-1", "warp-1", "warp-2", "warp-3", "fold-2"].map((k) => ({ k, src: `${ASSETS}bg/${k}.jpg` }));
  const BG_DEFAULT = "fold-2"; // по умолчанию последний из присланных Katya
  const bgSrc = (p) => {
    const b = p.bg || BG_DEFAULT;
    const pre = BGS.find((x) => x.k === b);
    return pre ? pre.src : b; // своё фото хранится как data:/blob: URL
  };
  // Иконки — SVG из макета Katya (27.11), цвет через currentColor
  const LI = {
    pin: '<svg viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M8 16s7-4 7-9.33C15 2.98 11.87 0 8 0S1 2.98 1 6.67C1 12 8 16 8 16Zm0-7.43a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>',
    list: '<svg viewBox="0 0 16 16"><path d="M5.5 3.5h9M5.5 8h9M5.5 12.5h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="2" cy="3.5" r="1.1" fill="currentColor"/><circle cx="2" cy="8" r="1.1" fill="currentColor"/><circle cx="2" cy="12.5" r="1.1" fill="currentColor"/></svg>',
    edit: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M11.97 1.28a.97.97 0 0 0-1.37 0L9.23 2.66l4.11 4.11 1.37-1.37a.97.97 0 0 0 0-1.37l-2.74-2.75ZM11.97 8.14 7.86 4.03 1 10.89V15h4.11l6.86-6.86Z"/></svg>',
    note: '<svg viewBox="0 0 17 17" fill="none"><path d="M14.0828 1.4172C13.5265 0.860927 12.6246 0.860933 12.0684 1.41722L11.0612 2.42443L13.0756 4.43896L14.0828 3.43159C14.6391 2.87531 14.639 1.97346 14.0828 1.4172Z" fill="currentColor"/><path d="M11.5648 6.95678L12.572 7.96398L10.054 10.482L11.0612 11.4892L13.162 9.38838C13.9486 8.60171 13.9486 7.32626 13.162 6.53959L9.55038 2.92798L2.5 9.70927V13H5.52159L11.5648 6.95678Z" fill="currentColor"/></svg>',
    react: '<svg viewBox="0 0 17 18" fill="none"><circle cx="9.87" cy="6.37" r="1.2" fill="currentColor"/><circle cx="6.28" cy="6.37" r="1.2" fill="currentColor"/><path d="M5.06 9.25h5.99c-.2.8-1.08 2.39-2.99 2.39S5.26 10.05 5.06 9.25Z" fill="currentColor"/><path d="M14.5254 0V1.99219H16.5176V3.99219H14.5254V5.98438H12.5234V3.99219H10.5312V1.99219H12.5234V0H14.5254Z" fill="currentColor"/><path d="M0.492188 8.38867C0.492334 4.20076 3.88728 0.805811 8.0752 0.805664V2.80566C4.99185 2.80581 2.49233 5.30533 2.49219 8.38867C2.49219 11.4721 4.99176 13.9725 8.0752 13.9727C11.1588 13.9727 13.6592 11.4722 13.6592 8.38867H15.6592C15.6592 12.5768 12.2633 15.9727 8.0752 15.9727C3.88719 15.9725 0.492188 12.5767 0.492188 8.38867Z" fill="currentColor"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    exit: '<svg viewBox="0 0 24 24"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M0 7h16v2H0z"/><path fill="currentColor" d="M7 0h2v16H7z"/></svg>',
    more: '<svg viewBox="0 0 24 24"><g fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></g></svg>',
  };
  // «Новое» — то, что я ещё не оценил и не обсуждал
  const isFresh = (p, id) => !Object.values(p.reactions[id] || {}).some((l) => l.includes(store.me)) && !(p.notes[id] || []).some((n) => n.who === store.me);
  function gridFootHtml(p, id) {
    const notes = p.notes[id] || [];
    const who = [...new Set(notes.map((n) => n.who))];
    const reacts = Object.entries(p.reactions[id] || {}).filter(([, list]) => list.length);
    return `<div class="fw-gc__foot" data-foot="${id}">
      <span class="fw-gc__reacts">
        ${reacts.map(([e, list]) => `<button class="fw-react${list.includes(store.me) ? " is-mine" : ""}" type="button" data-tg="react" data-id="${id}" data-emoji="${e}">${e}<b>${list.length}</b></button>`).join("")}
        <button class="fw-react fw-react--add" type="button" data-tg="react-add" data-id="${id}" aria-label="Добавить реакцию">${LI.react}</button>
        ${notes.length ? "" : `<button class="fw-react fw-react--add fw-gc__write" type="button" data-tg="notes" data-id="${id}" aria-label="Добавить заметку">${LI.note}</button>`}
      </span>
      ${notes.length ? `<button class="fw-mc__notes fw-gc__notes" type="button" data-tg="notes" data-id="${id}"><span class="fw-mc__avs">${who.map((m) => `<img class="fw-av" src="${PEOPLE[m].img}" alt="${PEOPLE[m].name}" />`).join("")}</span>${notesWord(notes.length)}</button>` : ""}
    </div>`;
  }
  function gridCardHtml(l, p) {
    const params = [l.rooms ? `${l.rooms}-к. кв.` : "Студия", `${String(l.area).replace(".", ",")} м²`, `${l.floor}/${l.floorsTotal} эт.`].join(" · ");
    const on = store.saved.includes(l.id);
    return `<div class="fw-gc" data-open-card="${l.id}">
      <div class="fw-gc__photo" style="background-image:url('${photo(l.id)}')">
        <button class="fw-gc__fav${on ? " is-active" : ""}" type="button" data-tg="fav" data-id="${l.id}" aria-label="В избранное">${on ? App.ICONS.heartFilled20 : App.ICONS.heart20}</button>
      </div>
      <div class="fw-gc__price">${priceStr(l)}</div>
      <div class="fw-gc__params">${params}</div>
      ${l.metro ? `<div class="fw-gc__metro"><i style="color:#${l.metroColor || "0468FF"}">M</i>${esc(l.metro)}</div>` : ""}
      ${gridFootHtml(p, l.id)}
    </div>`;
  }
  function screenPodborkaList(p, top, items) {
    const empty = !items.length;
    const view = top.view && top.view !== "half" && top.view !== "full" ? top.view : "list";
    top.view = view;
    const filter = top.filter || "all";
    const shown = filter === "new" ? items.filter((l) => isFresh(p, l.id)) : items;
    const strip = p.type === "daily" ? `${DATES[p.dates].short}<i>·</i>${p.guests} ${plural(p.guests, ["гость", "гостя", "гостей"])}` : variants(items.length);
    return `<div class="fw-pb fw-pb--list is-${view}">
      <div class="fw-pb__map" data-tg="map">${pinsHtml(items).replace(/<\/div>$/, placesHtml(p) + "</div>")}</div>
      <div class="fw-pb__head fw-hero">
        <div class="fw-hero__img" style="background-image:url('${bgSrc(p)}')"></div>
        <div class="fw-pb__bar fw-hero__bar">
          <button class="fw-pb__icon" type="button" data-act="back" aria-label="Назад">${IC.back}</button>
          <div class="fw-pb__title">${esc(p.name)}</div>
          <button class="fw-hero__members" type="button" data-tg="share" aria-label="Позвать в подборку"><span class="fw-hero__avs">${avatars(p)}</span><span class="fw-hero__plus">${LI.plus}</span></button>
          <button class="fw-hero__more" type="button" data-tg="more" aria-label="Ещё">${LI.more}</button>
        </div>
        <div class="fw-hero__strip">
          <button class="fw-hero__dates" type="button" data-tg="${p.type === "daily" ? "dates" : "settings"}">${strip}</button>
          <button class="fw-hero__edit" type="button" data-tg="${p.type === "daily" ? "dates" : "settings"}" aria-label="Даты и гости">${LI.edit}</button>
        </div>
      </div>
      <button class="fw-lv__tolist" type="button" data-tg="pbview" data-v="list">${LI.list}Список</button>
      ${empty ? "" : `<div class="fw-pb__carousel">${items.map((l) => mapCardHtml(l, p)).join("")}</div>`}
      <div class="fw-lv">
        <div class="fw-lv__chips">
          <button class="fw-lv__chip${filter === "all" ? " is-on" : ""}" type="button" data-tg="pbfilter" data-f="all">Все ${items.length}</button>
          <button class="fw-lv__chip${filter === "new" ? " is-on" : ""}" type="button" data-tg="pbfilter" data-f="new">Новое</button>
          <button class="fw-lv__chip fw-lv__chip--map" type="button" data-tg="pbview" data-v="map">${LI.pin}На карте</button>
        </div>
        ${empty ? FW.emptyStateHtml(FW.EMPTY.newPodborka) : shown.length ? `<div class="fw-gc-grid">${shown.map((l) => gridCardHtml(l, p)).join("")}</div>` : `<div class="fw-lv__none">Всё новое вы уже посмотрели</div>`}
      </div>
    </div>`;
  }
  // Вид «Список»: при скролле шапка плавно складывается в вид, как на карте — синий верх без картинки + плашка с датами (Katya 27.11)
  const HERO_FOLD = 66; // на столько опускается плашка под картинкой
  function watchHero(root) {
    const lv = $(".fw-lv", root);
    const hero = $(".fw-hero", root);
    const strip = hero && $(".fw-hero__strip", hero);
    const img = hero && $(".fw-hero__img", hero);
    if (!lv || !strip) return;
    const pb = $(".fw-pb", root);
    const apply = () => {
      const on = pb.classList.contains("is-list");
      const y = on ? Math.max(0, Math.min(lv.scrollTop, HERO_FOLD)) : 0;
      strip.style.transition = on ? "none" : "";
      strip.style.marginTop = on ? HERO_FOLD - y + "px" : "";
      // картинка заливается синим как на карте (а не гаснет до голубой плашки)
      img.style.boxShadow = on && y ? `inset 0 0 0 999px rgba(31, 95, 245, ${(y / HERO_FOLD).toFixed(3)})` : "";
    };
    lv.addEventListener("scroll", apply, { passive: true });
    new MutationObserver(apply).observe(pb, { attributes: true, attributeFilter: ["class"] });
    apply();
  }
  function openSettings(p) {
    let bg = p.bg || BG_DEFAULT;
    const own = () => (BGS.some((x) => x.k === bg) ? (p.bgOwn || null) : bg);
    const tiles = () =>
      BGS.map((x) => `<button class="fw-bgpick__opt${x.k === bg ? " is-on" : ""}" type="button" data-bg="${x.k}" style="background-image:url('${x.src}')" aria-label="Фон"></button>`).join("") +
      (own() ? `<button class="fw-bgpick__opt${own() === bg ? " is-on" : ""}" type="button" data-bg="${own()}" style="background-image:url('${own()}')" aria-label="Своё фото"></button>` : "") +
      `<label class="fw-bgpick__opt fw-bgpick__own"><input type="file" accept="image/*" hidden />${IC.plus}<span>Своё фото</span></label>`;
    const { wrap, close } = sheet(`
      <div class="fw-sheet__title">Название и фон</div>
      <label class="fw-field"><span>Название</span><input type="text" data-name value="${esc(p.name)}" maxlength="40" /></label>
      <div class="fw-set__label">Фон шапки</div>
      <div class="fw-bgpick">${tiles()}</div>
      <div class="fw-dates__note">Фон увидят все участники подборки</div>
      <button class="fw-btn fw-btn--primary" type="button" data-ok>Готово</button>`, "fw-sheet--settings");
    const preview = () => {
      const img = $(".fw-hero__img", FW.root);
      if (img) img.style.backgroundImage = `url('${bg.includes(":") ? bg : BGS.find((x) => x.k === bg).src}')`;
      $(".fw-bgpick", wrap).innerHTML = tiles();
    };
    wrap.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        bg = p.bgOwn = r.result;
        preview();
      };
      r.readAsDataURL(f);
    });
    wrap.addEventListener("click", (e) => {
      const t = e.target.closest("[data-bg]");
      if (t) {
        bg = t.dataset.bg;
        preview();
        return;
      }
      if (e.target.closest('[data-s="dates"]')) {
        close();
        setTimeout(() => openDates(p), 260);
        return;
      }
      if (e.target.closest("[data-ok]")) {
        const name = $("[data-name]", wrap).value.trim();
        if (name) p.name = name;
        p.bg = bg;
        p.updated = Date.now();
        close();
        FW.rerender();
      }
    });
    // закрыли шторку без «Готово» — вернуть прежний фон
    $(".fw-sheet-backdrop", wrap).addEventListener("click", () => {
      const img = $(".fw-hero__img", FW.root);
      if (img) img.style.backgroundImage = `url('${bgSrc(p)}')`;
    });
  }

  function setView(v) {
    const top = stack[stack.length - 1] || {};
    top.view = v;
    if (v !== "card") top.active = null;
    const pb = $(".fw-pb", FW.root);
    if (!pb) return;
    pb.classList.remove("is-half", "is-card", "is-full", "is-map", "is-list");
    pb.classList.add("is-" + v);
    pb.classList.toggle("is-expanded", v === "full");
    const sh = $(".fw-pb__sheet", pb);
    if (sh) sh.scrollTop = 0;
    const list = $(".fw-pb__list", pb);
    if (list) list.scrollTop = 0;
    markPin(top.active);
  }
  function markPin(id) {
    FW.root.querySelectorAll(".fw-mpin").forEach((x) => x.classList.toggle("is-active", !!id && x.dataset.id === id));
  }
  function scrollToCard(id, smooth) {
    const car = $(".fw-pb__carousel", FW.root);
    const card = car && car.querySelector(`[data-open-card="${id}"]`);
    if (card) car.scrollTo({ left: card.offsetLeft - 24, behavior: smooth ? "smooth" : "auto" });
    markPin(id);
  }
  // Как на выдаче: синим горит пин карточки, которая сейчас в центре карусели
  function watchCarousel(top) {
    const car = $(".fw-pb__carousel", FW.root);
    if (!car) return;
    let raf = 0;
    car.addEventListener("scroll", () => {
      if (top.view !== "card" || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const mid = car.getBoundingClientRect().left + car.clientWidth / 2;
        let best = null, dist = Infinity;
        car.querySelectorAll("[data-open-card]").forEach((c) => {
          const r = c.getBoundingClientRect();
          const d = Math.abs(r.left + r.width / 2 - mid);
          if (d < dist) (dist = d), (best = c);
        });
        if (best && best.dataset.openCard !== top.active) {
          top.active = best.dataset.openCard;
          markPin(top.active);
        }
      });
    });
    if (top.view === "card" && top.active) scrollToCard(top.active, false);
  }

  // Полшторки: скролл списка вниз тянет шторку вверх, пока она не займёт весь экран под шапкой (Katya 26.11)
  const FULL_TOP = 128;
  function watchSheet(top) {
    // Полшторки тянется за скроллом: вверх — до полного экрана, вниз — сворачивается и открывает карту (Katya 26.11).
    // В полном экране: скролл вверх на самом верху списка — обратно к половине.
    const pb = $(".fw-pb", FW.root);
    const sh = pb && $(".fw-pb__sheet", pb);
    if (!sh) return;
    let move = 0, base = 0, touchY = null, wheelT;
    const is = (v) => pb.classList.contains("is-" + v);
    const maxTop = () => pb.clientHeight - 72;
    const begin = () => {
      if (!move) base = sh.getBoundingClientRect().top - pb.getBoundingClientRect().top;
    };
    const apply = () => {
      sh.style.transition = "none";
      sh.style.top = Math.min(maxTop(), Math.max(FULL_TOP, base - move)) + "px";
    };
    const finish = () => {
      sh.style.transition = "";
      sh.style.top = "";
      const m = move;
      move = 0;
      if (m > 20) setView("full");
      else if (m < -20) setView("map");
    };
    const onDelta = (d) => {
      // d > 0 — список тянут вверх
      if (is("half")) {
        begin();
        move += d;
        apply();
        return true;
      }
      if (is("full") && d < 0 && sh.scrollTop <= 0) {
        setView("half");
        return true;
      }
      if (is("map") && d > 0) {
        setView("half");
        return true;
      }
      return false;
    };
    sh.addEventListener(
      "wheel",
      (e) => {
        if (!onDelta(e.deltaY)) return;
        e.preventDefault();
        clearTimeout(wheelT);
        if (is("half")) wheelT = setTimeout(finish, 160);
      },
      { passive: false }
    );
    sh.addEventListener("touchstart", (e) => ((touchY = e.touches[0].clientY), begin()), { passive: true });
    sh.addEventListener(
      "touchmove",
      (e) => {
        if (touchY === null) return;
        const d = touchY - e.touches[0].clientY;
        if (is("half")) {
          e.preventDefault();
          move = d;
          apply();
        } else if ((is("full") && d < -30 && sh.scrollTop <= 0) || (is("map") && d > 30)) {
          touchY = null;
          setView("half");
        }
      },
      { passive: false }
    );
    sh.addEventListener("touchend", () => {
      if (touchY !== null && is("half") && move) finish();
      touchY = null;
    });
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
    // Внутри подборки таб-бара нет, выход — стрелкой «назад» (правка Katya)
    document.body.classList.toggle("fw-in-podborka", FW.tab === "fav" && top.type === "podborka");
    if (FW.tab === "home") document.querySelectorAll(".fw-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === "home"));
    // Строка заметок и реакций — и под большим сниппетом new4 в списке подборки
    if (top.type === "podborka") {
      const p = store.podborki.find((x) => x.id === top.id);
      if (!p) return;
      watchCarousel(top);
      watchSheet(top);
      watchHero(root);
      mountLiveMap(root, top, p);
      root.querySelectorAll(".fw-pb__list .card[data-listing-id]").forEach((card) => {
        const id = card.dataset.listingId;
        card.insertAdjacentHTML("beforeend", footHtml(p, id).replace('class="fw-mc__foot"', 'class="fw-mc__foot fw-mc__foot--n4"'));
      });
    }
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
    // Обложка — большой коллаж сверху; тап меняет главное фото (решение Katya: название + обложка)
    const covers = listingId ? [listingId].concat(pool.filter((x) => x !== listingId)) : pool;
    let ci = 0;
    let cover = null;
    const colHtml = () => {
      const first = covers[ci];
      const rest = listingId ? [] : covers.filter((x) => x !== first).slice(0, 2);
      return [first, rest[0], rest[1]].map((x) => `<span${x ? ` style="background-image:url('${photo(x)}')"` : ""}></span>`).join("");
    };
    const { wrap, close } = sheet(`
      <button class="fw-new__cover" type="button" data-cover-next aria-label="Сменить обложку">
        <span class="fw-new__col">${colHtml()}</span>
        ${covers.length > 1 ? `<span class="fw-new__swap">${CI_SWAP}</span>` : ""}
      </button>
      <div class="fw-new__title">Новая подборка</div>
      <label class="fw-new__field"><input type="text" value="${esc(names[0])}" maxlength="40" placeholder="Название" aria-label="Название" /><button type="button" class="fw-new__clear" data-clear aria-label="Очистить">${TI.close}</button></label>
      <div class="fw-sugg">${names.map((n, i) => `<button class="fw-sugg__chip${i === 0 ? " is-on" : ""}" type="button" data-name="${esc(n)}">${esc(n)}</button>`).join("")}</div>
      ${daily ? `<div class="fw-new__dates">${LI.cal}<span><b>${DATES[SEARCH.dates].short} · ${SEARCH.guests} ${plural(SEARCH.guests, ["гость", "гостя", "гостей"])}</b><span>Даты и гости из поиска, поменять можно в подборке</span></span></div>` : ""}
      <div class="fw-together">
        <span class="fw-together__pair fw-brand-pill"><img class="fw-av" src="${PEOPLE[store.me].img}" alt="" /><span class="fw-av fw-av--plus">${IC.plus}</span></span>
        <span><b>Выбирать вместе</b><span>Позовите близкого — оценивайте варианты вдвоём, без чата</span></span>
      </div>
      <div class="fw-new__btns">
        <button class="fw-btn fw-btn--primary" type="button" data-create="solo">Создать</button>
        <button class="fw-btn fw-btn--secondary" type="button" data-create="together">Поделиться</button>
      </div>`, "fw-sheet--new");
    const input = $("input", wrap);
    const syncBtns = () => wrap.querySelectorAll("[data-create]").forEach((b) => (b.disabled = !input.value.trim()));
    input.addEventListener("input", () => {
      wrap.querySelectorAll("[data-name]").forEach((b) => b.classList.toggle("is-on", b.dataset.name === input.value));
      syncBtns();
    });
    wrap.addEventListener("click", (e) => {
      const s = e.target.closest("[data-name]");
      if (s) {
        input.value = s.dataset.name;
        wrap.querySelectorAll("[data-name]").forEach((b) => b.classList.toggle("is-on", b === s));
        syncBtns();
        return;
      }
      if (e.target.closest("[data-clear]")) {
        input.value = "";
        wrap.querySelectorAll("[data-name]").forEach((b) => b.classList.remove("is-on"));
        syncBtns();
        input.focus();
        return;
      }
      if (e.target.closest("[data-cover-next]")) {
        if (covers.length < 2) return;
        ci = (ci + 1) % covers.length;
        cover = covers[ci];
        $(".fw-new__col", wrap).innerHTML = colHtml();
        return;
      }
      const go = e.target.closest("[data-create]");
      if (!go) return;
      const p = ensure({ id: "p" + Date.now(), name: input.value.trim() || names[0], items: listingId ? [listingId] : [], cover, type: daily ? "daily" : "long", dates: SEARCH.dates, guests: SEARCH.guests, members: [store.me], creator: store.me });
      store.podborki.unshift(p);
      if (listingId) remember(p, listingId);
      if (listingId && !store.saved.includes(listingId)) FW.setSaved(listingId, true);
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

  // Коллаж-миниатюра: большое фото слева, два справа (Figma «куда сохранить»)
  function miniCollage(p) {
    const ids = [p.cover || p.items[0]].concat(p.items.filter((x) => x !== (p.cover || p.items[0]))).filter(Boolean).slice(0, 3);
    return `<span class="fw-mcol">${[0, 1, 2].map((i) => `<span${ids[i] ? ` style="background-image:url('${photo(ids[i])}')"` : ""}></span>`).join("")}</span>`;
  }

  // Figma «Зажатие лайка → шорткаты»: меню у сердца — подборки и «Новая подборка»
  function openQuick(id, anchor) {
    const app = $(".app");
    const a = app.getBoundingClientRect(), r = anchor.getBoundingClientRect();
    const k = a.width / app.offsetWidth || 1;
    const list = store.podborki.slice(0, 4).map(ensure);
    const wrap = document.createElement("div");
    wrap.className = "fw-quick-wrap";
    wrap.innerHTML = `<div class="fw-quick">
        ${list
          .map((p) => {
            const has = p.items.includes(id);
            return `<button class="fw-quick__row${has ? " is-in" : ""}" type="button" data-q="${p.id}">${miniCollage(p)}<span>${esc(p.name)}</span>${has ? `<i class="fw-quick__ok">${IC.check || "✓"}</i>` : ""}</button>`;
          })
          .join("")}
        <button class="fw-quick__row fw-quick__row--new" type="button" data-q-new><span class="fw-mcol fw-mcol--plus"><svg viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span><span>Новая подборка</span></button>
      </div>`;
    app.appendChild(wrap);
    const box = $(".fw-quick", wrap);
    const H = app.offsetHeight, top = (r.bottom - a.top) / k + 6;
    // Сердце слева (v4) — меню растёт вправо, справа (as is, v1) — влево
    const W = app.offsetWidth, cx = (r.left + r.width / 2 - a.left) / k;
    if (cx < W / 2) {
      box.style.left = Math.max(12, (r.left - a.left) / k - 6) + "px";
      box.style.transformOrigin = "top left";
    } else box.style.right = Math.max(12, (a.right - r.right) / k - 6) + "px";
    if (top + box.offsetHeight > H - 96) box.style.bottom = Math.max(12, H - (r.top - a.top) / k + 6) + "px";
    else box.style.top = top + "px";
    requestAnimationFrame(() => wrap.classList.add("is-open"));
    const close = () => {
      wrap.classList.remove("is-open");
      setTimeout(() => wrap.remove(), 180);
    };
    wrap.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = e.target.closest("[data-q]");
      if (row) {
        const p = store.podborki.find((x) => x.id === row.dataset.q);
        close();
        remember(p, id);
        if (!p.items.includes(id)) {
          p.items.unshift(id);
          p.updated = Date.now();
          FW.toast(`Добавлено в «${p.name}»`);
          if (FW.tab === "fav") FW.rerender();
        } else FW.toast(`Уже в «${p.name}»`);
        return;
      }
      if (e.target.closest("[data-q-new]")) {
        close();
        setTimeout(() => openCreate(id, byId(id) && byId(id).dealType === "daily"), 180);
        return;
      }
      if (!e.target.closest(".fw-quick")) {
        close();
        // закрыли меню, ничего не выбрав, — сердце уже горит, кладём как обычный тап
        if (store.saved.includes(id) && !store.podborki.some((p) => p.items.includes(id))) {
          const p = autoSave(id);
          FW.toast(`Сохранено в «${p.name}»`, { label: "Изменить", run: () => openPick(id) }, 0, { cls: "fw-toast--saved", icon: App.ICONS.heartFilled });
        }
      }
    });
  }

  // 2A Ани + Figma «куда сохранить» (27.11): «Новая подборка» первой строкой, коллажи, «Готово»
  function openPick(id) {
    const l = byId(id);
    const daily = l && l.dealType === "daily";
    // «Изменить» из снека: видно, где объявление уже лежит, галочку можно снять (как «Change» в Airbnb)
    const picked = new Set(store.podborki.filter((p) => p.items.includes(id)).map((p) => p.id));
    const before = new Set(picked);
    const rows = store.podborki
      .map((p) => {
        ensure(p);
        const has = p.items.includes(id);
        const cov = p.cover || p.items[0];
        const n = p.items.length;
        return `<button class="fw-pick__row" type="button" data-pick="${p.id}">
          <span class="fw-pick__thumb fw-pick__thumb--col">${miniCollage(p)}</span>
          <span class="fw-pick__body"><b>${esc(p.name)}</b><span>${n} ${plural(n, ["объявление", "объявления", "объявлений"])}</span></span>
          ${p.members.length > 1 ? `<span class="fw-pick__avs">${avatars(p)}</span>` : ""}
          <span class="fw-pick__check${has ? " is-on" : ""}"></span>
        </button>`;
      })
      .join("");
    const { wrap, close } = sheet(`
      <div class="fw-sheet__title">Сохранить в подборку</div>
      <div class="fw-pick">
        <button class="fw-pick__row" type="button" data-pick-new>
          <span class="fw-pick__thumb fw-pick__thumb--plus">${IC.plus}</span>
          <span class="fw-pick__body"><b>Новая подборка</b><span>Можно позвать близкого</span></span>
        </button>
        ${rows}
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
        const list = store.podborki.filter((p) => picked.has(p.id) && !before.has(p.id));
        const gone = store.podborki.filter((p) => before.has(p.id) && !picked.has(p.id));
        list.forEach((p) => {
          p.items.unshift(id);
          p.updated = Date.now();
        });
        gone.forEach((p) => {
          p.items = p.items.filter((x) => x !== id);
          p.updated = Date.now();
        });
        if (list.length) remember(list[list.length - 1], id);
        else if (gone.length && store.lastPick && gone.some((p) => p.id === store.lastPick.pid)) store.lastPick = null;
        if (list.length && !store.saved.includes(id)) FW.setSaved(id, true);
        const orphan = !store.podborki.some((p) => p.items.includes(id));
        if (orphan && store.saved.includes(id)) {
          // ни в одной подборке — значит, не сохранено
          FW.setSaved(id, false);
          document.querySelectorAll(`.fw-root .card[data-listing-id="${id}"], #results-list .card[data-listing-id="${id}"]`).forEach(FW.syncCardHeart);
        }
        if (list.length) FW.toast(`Сохранено в ${list.map((p) => `«${p.name}»`).join(", ")}`);
        else if (gone.length) FW.toast(orphan ? "Убрано из Избранного" : `Убрано из ${gone.map((p) => `«${p.name}»`).join(", ")}`);
        if (FW.tab === "fav") FW.rerender();
      }
    });
  }

  // ---------- Логика вишлистов Airbnb (Katya 27.11, пункты 1–3) ----------
  // 1. Сохранения из того же поиска попадают в ту же подборку: запоминаем последнюю подборку, куда клали вручную
  const dealOf = (id) => (byId(id) && byId(id).dealType === "daily" ? "daily" : "long");
  function remember(p, id) {
    store.lastPick = { pid: p.id, deal: dealOf(id) };
  }
  // Без «Все сохранённые» (Katya 27.11) у сохранения всегда есть подборка: последняя из этого поиска,
  // а если её нет — подборка по умолчанию для типа сделки (создаётся сама, переименовать можно в «⋯»)
  const DEFAULT_NAME = { daily: "Посуточно в СПб", long: "Аренда в СПб" };
  function defaultPodborka(deal) {
    let p = store.podborki.find((x) => x.auto === deal && x.members.includes(store.me));
    if (!p) {
      p = ensure({ id: "p" + Date.now(), auto: deal, name: DEFAULT_NAME[deal], items: [], type: deal, dates: SEARCH.dates, guests: SEARCH.guests, members: [store.me], creator: store.me });
      store.podborki.unshift(p);
    }
    return p;
  }
  function autoSave(id) {
    const lp = store.lastPick;
    const top = stack[stack.length - 1] || {};
    let p = FW.tab === "fav" && top.type === "podborka" && store.podborki.find((x) => x.id === top.id); // сердце внутри подборки — в неё же
    if (!p) p = lp && lp.deal === dealOf(id) && store.podborki.find((x) => x.id === lp.pid && x.members.includes(store.me));
    if (!p) p = defaultPodborka(dealOf(id));
    remember(p, id);
    if (p.items.includes(id)) return p;
    p.items.unshift(id);
    p.updated = Date.now();
    if (FW.tab === "fav") FW.rerender();
    return p;
  }
  // 3. Удалить подборку может только создатель (принцип 7 Ани), участник — выйти
  function confirmDrop(p) {
    const mine = p.creator === store.me;
    const { wrap, close } = sheet(`
      <div class="fw-sheet__title">${mine ? "Удалить подборку?" : "Выйти из подборки?"}</div>
      <div class="fw-dates__note">${mine ? `«${esc(p.name)}» пропадёт у всех участников. Объявления останутся в Избранном.` : `«${esc(p.name)}» пропадёт у вас. ${PEOPLE[p.creator].name} и остальные продолжат выбирать.`}</div>
      <button class="fw-btn fw-btn--danger" type="button" data-drop>${mine ? "Удалить" : "Выйти"}</button>
      <button class="fw-btn fw-btn--secondary" type="button" data-cancel>Отмена</button>`, "fw-sheet--drop");
    wrap.addEventListener("click", (e) => {
      if (e.target.closest("[data-cancel]")) return close();
      if (!e.target.closest("[data-drop]")) return;
      close();
      // в прототипе одно хранилище на обоих — вышедший участник просто перестаёт видеть подборку
      // (сценарий «Аня» из панели соберёт её заново)
      store.podborki = store.podborki.filter((x) => x !== p);
      // объявления, которых больше нет ни в одной подборке, перестают быть сохранёнными
      if (mine) p.items.filter((id) => !store.podborki.some((x) => x.items.includes(id))).forEach((id) => (store.saved = store.saved.filter((x) => x !== id)));
      if (store.lastPick && store.lastPick.pid === p.id) store.lastPick = null;
      while (stack.length && stack[stack.length - 1].type === "podborka") stack.pop();
      if (!stack.length) stack.push({ type: "section", key: "podborki" });
      FW.rerender();
      FW.toast(mine ? `Подборка «${p.name}» удалена` : `Вы вышли из «${p.name}»`);
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

  function openMore(p) {
    const { wrap, close } = sheet(`
      <div class="fw-menu">
        <button class="fw-menu__row" type="button" data-m="place"><span class="fw-menu__ic"><img src="${ASSETS}together/place-pool.png" alt="" /></span><span><b>Добавить моё место</b><span>Работа, бассейн, родители — увидите, что рядом</span></span></button>
        ${PB_LIST ? `<button class="fw-menu__row" type="button" data-m="look"><span class="fw-menu__ic fw-menu__ic--bg" style="background-image:url('${bgSrc(p)}')"></span><span><b>Название и фон</b><span>Переименовать подборку, сменить картинку в шапке</span></span></button>` : ""}
        <button class="fw-menu__row" type="button" data-m="share"><span class="fw-menu__ic fw-menu__ic--blue">${IC.plus}</span><span><b>Позвать в подборку</b></span></button>
        <button class="fw-menu__row fw-menu__row--danger" type="button" data-m="drop"><span class="fw-menu__ic fw-menu__ic--red">${p.creator === store.me ? LI.trash : LI.exit}</span><span><b>${p.creator === store.me ? "Удалить подборку" : "Выйти из подборки"}</b></span></button>
      </div>`);
    wrap.addEventListener("click", (e) => {
      const m = e.target.closest("[data-m]");
      if (!m) return;
      close();
      const go = { place: openAddPlace, look: openSettings, drop: confirmDrop, share: openShare }[m.dataset.m];
      setTimeout(() => go(p), 260);
    });
  }
  function openAddPlace(p) {
    let kind = "pool";
    const { wrap, close } = sheet(`
      <div class="fw-sheet__title">Моё место</div>
      <div class="fw-placepick">${Object.entries(PLACE_KINDS)
        .map(([k, v]) => `<button class="fw-placepick__opt${k === kind ? " is-on" : ""}" type="button" data-kind="${k}"><img src="${ASSETS}together/${v.img}" alt="" /><span>${v.label}</span></button>`)
        .join("")}</div>
      <label class="fw-field"><span>Заметка</span><input type="text" placeholder="${esc(PLACE_KINDS[kind].hint)}" maxlength="120" /></label>
      <div class="fw-dates__note">Место и заметку увидят все участники подборки</div>
      <button class="fw-btn fw-btn--primary" type="button" data-go>Отметить на карте</button>`);
    const input = $("input", wrap);
    wrap.addEventListener("click", (e) => {
      const k = e.target.closest("[data-kind]");
      if (k) {
        kind = k.dataset.kind;
        wrap.querySelectorAll("[data-kind]").forEach((b) => b.classList.toggle("is-on", b === k));
        input.placeholder = PLACE_KINDS[kind].hint;
        return;
      }
      if (!e.target.closest("[data-go]")) return;
      const text = input.value.trim();
      close();
      placeOnMap(p, kind, text);
    });
  }
  // режим «нажмите на карту»: следующий тап по карте ставит место
  function placeOnMap(p, kind, text) {
    const pb = $(".fw-pb", FW.root);
    if (!pb) return;
    if (pb.classList.contains("is-list")) setView("map"); // версия «список»: место ставим на карте
    pb.classList.add("is-placing");
    const hint = document.createElement("div");
    hint.className = "fw-place-hint";
    hint.innerHTML = `<img src="${ASSETS}together/${PLACE_KINDS[kind].img}" alt="" /><span>Нажмите на карту, где это место</span><button type="button">Отмена</button>`;
    pb.appendChild(hint);
    const map = $(".fw-pb__map", pb);
    const isLive = live && live.pid === p.id && map.classList.contains("is-live");
    const done = () => {
      pb.classList.remove("is-placing");
      hint.remove();
      map.removeEventListener("click", onMap, true);
      if (live) live.placing = null;
    };
    const save = (pl) => {
      p.places.push(pl);
      if (text) p.notes[pl.id] = [{ who: store.me, text, ts: Date.now() }];
      p.updated = Date.now();
      done();
      FW.rerender();
      FW.toast(`Место «${PLACE_KINDS[kind].label}» на карте`);
    };
    if (isLive) {
      live.placing = (c) => save({ id: "pl" + Date.now(), kind, who: store.me, lat: +c[0].toFixed(6), lon: +c[1].toFixed(6) });
      $("button", hint).addEventListener("click", done);
      return;
    }
    function onMap(e) {
      e.preventDefault();
      e.stopPropagation();
      const r = $(".fw-pins", map).getBoundingClientRect();
      const pl = {
        id: "pl" + Date.now(),
        kind,
        who: store.me,
        x: +(((e.clientX - r.left) / r.width) * 100).toFixed(2),
        y: +(((e.clientY - r.top) / r.height) * 100).toFixed(2),
      };
      save(pl);
    };
    $("button", hint).addEventListener("click", done);
    map.addEventListener("click", onMap, true);
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
        p.updated = Date.now();
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
        <label class="fw-field fw-inv__name"><span>Как вас зовут?</span><input type="text" placeholder="Имя" autocomplete="given-name" maxlength="24" /></label>
        <div class="fw-inv__hint">Под этим именем вас увидит ${PEOPLE[p.creator].name}</div>
        <button class="fw-btn fw-btn--primary" type="button" data-inv="join" disabled>Присоединиться</button>
        <button class="fw-btn fw-btn--secondary" type="button" data-inv="later">Не сейчас</button>
        <div class="fw-inv__consent">Нажимая «Присоединиться», вы соглашаетесь, что участники подборки увидят ваше имя и оценки</div>
      </div>`;
    const nameIn = $(".fw-inv__name input", inv);
    nameIn.addEventListener("input", () => ($('[data-inv="join"]', inv).disabled = !nameIn.value.trim()));
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
    if (!b || b.disabled) return;
    const p = store.podborki.find((x) => x.id === inv.dataset.pid);
    closeInvite();
    if (b.dataset.inv === "join") {
      // Имя приглашённого расходится по всем экранам (у Ани — setMyName)
      const n = $(".fw-inv__name input", inv).value.trim();
      PEOPLE.dima.name = n ? n[0].toUpperCase() + n.slice(1) : "Дима";
      store.me = "dima";
      if (!p.members.includes("dima")) p.members.push("dima");
      p.updated = Date.now();
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
    if (e.target.closest(".fw-ymap")) return;
    // режим «отметить место»: тап по пину тоже ставит место, а не открывает карточку
    if (e.target.closest(".is-placing .fw-pb__map")) return;
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
        document.querySelectorAll(`.fw-root .card[data-listing-id="${id}"]`).forEach(FW.syncCardHeart);
      } else if (a === "sort" && p) {
        p.sort = p.sort === "price" ? "added" : "price";
        FW.rerender();
        FW.toast(p.sort === "price" ? "Сначала дешевле" : "По дате добавления");
      } else if (a === "toggle") {
        if (p && p.items.length) setView((top.view || "half") === "half" ? "full" : "half");
        // из свёрнутой (map/card) — к половине
      } else if (a === "map" && p) {
        // тап по пустой карте — назад к стартовому виду
        if (top.view === "card") setView(top.prev || "half");
      } else if (a === "pin" && p) tapPin(t.dataset.id); else if (a === "notes" && p) openNotes(p, t.dataset.id);
      else if (a === "react" && p) {
        toggleReaction(p, t.dataset.id, t.dataset.emoji);
        refreshFoot(p, t.dataset.id);
      } else if (a === "react-add" && p) openReactPicker(t, p, t.dataset.id);
      else if (a === "call" || a === "chat") FW.toast(a === "call" ? "Звонок в прототипе не работает" : "Чат в прототипе не работает");
      else if (a === "dates" && p) openDates(p);
      else if (a === "share" && p) openShare(p);
      else if (a === "more" && p) openMore(p);
      else if (a === "settings" && p) openSettings(p);
      else if (a === "pbview" && p) setView(t.dataset.v);
      else if (a === "pbfilter" && p) {
        top.filter = t.dataset.f;
        FW.rerender();
      }
      else if (a === "place" && p) {
        const pl = p.places.find((x) => x.id === t.dataset.id);
        if (pl) openNotes(p, pl.id, PLACE_KINDS[pl.kind].label);
      }
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
    // Вид подборки: гибрид (карта + шторка) или список 2 в ряд (Katya 27.11)
    const vs = document.createElement("div");
    vs.className = "prototype-panel__section";
    const chips = () => [["hybrid", "Карта + список"], ["list", "Список"]].map(([v, l]) => `<button class="proto-chip${(v === "list") === PB_LIST ? " is-active" : ""}" type="button" data-pbv="${v}">${l}</button>`).join("");
    vs.innerHTML = `<div class="prototype-panel__section-title">Вид подборки</div><div class="prototype-panel__chips">${chips()}</div>`;
    vs.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pbv]");
      if (!b) return;
      e.stopPropagation();
      PB_LIST = b.dataset.pbv === "list";
      $(".prototype-panel__chips", vs).innerHTML = chips();
      const url = new URL(location.href);
      if (PB_LIST) url.searchParams.set("pb", "list");
      else url.searchParams.delete("pb");
      history.replaceState(null, "", url);
      stack.forEach((t) => t.type === "podborka" && ((t.view = null), (t.active = null)));
      if (!stack.some((t) => t.type === "podborka")) runScene("anya");
      else FW.rerender();
      const close = document.getElementById("prototype-panel-close");
      if (close && window.matchMedia("(max-width: 480px)").matches) close.click();
    });
    sec.after(vs);
    // Анимация Избранного — как у Ани: аберрация по гайду + цвет сохранённого сердечка
    const hs = document.createElement("div");
    hs.className = "prototype-panel__section";
    const hchips = () => FW.HEART_TONES.map(([v, l]) => `<button class="proto-chip${v === FW.getHeartTone() ? " is-active" : ""}" type="button" data-tone="${v}">${l}</button>`).join("");
    hs.innerHTML = `<div class="prototype-panel__section-title">Анимация Избранного</div><div class="fw-pp-desc">Аберрация по гайду, от центра: две плоские копии формы кнопки позади неё — жёлтый #F1AF12 у контента, оранжевый #F5631A снаружи. Заряд гаснет — «тихая громкость».</div><div class="fw-pp-label">Сохранённое сердечко</div><div class="prototype-panel__chips">${hchips()}</div><div class="fw-pp-desc">Тапните сердечко на выдаче.</div>`;
    hs.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tone]");
      if (!b) return;
      e.stopPropagation();
      FW.setHeartTone(b.dataset.tone);
      $(".prototype-panel__chips", hs).innerHTML = hchips();
    });
    vs.after(hs);
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
    autoSave,
    screen: screenPodborka,
    screens: { main: screenMain },
    after,
    sorter,
    openCreate,
    openPick,
    openQuick,
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
