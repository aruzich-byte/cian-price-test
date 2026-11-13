(function () {
  const { ICONS, formatPrice, priceMetric, computeResults, pinSheetRef } = window.App;

  // ---------- Тексты сниппета (квартира / дом, аренда / продажа) ----------
  function formatAreaRu(n) {
    return `${String(n).replace(".", ",")} м²`;
  }

  function flatTypeLabel(item) {
    if (item.flatType === "studio") return item.isApartments ? "Апарт-студия" : "Студия";
    if (item.flatType === "openPlan") return "Своб. планировка";
    return `${item.rooms}-комн. ${item.isApartments ? "апарт." : "кв."}`;
  }

  function floorsWord(n) {
    return n % 10 === 1 && n % 100 !== 11 ? "этаж" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "этажа" : "этажей";
  }

  // Квартира: «2-комн. кв. · 50 м² · 11/17 этаж»; дом: «Дом · 154 м² · участок 11,4 сот. · 2 этажа»
  function paramsLine(item) {
    if (item.propertyType === "house") {
      const parts = [item.houseKind, formatAreaRu(item.area)];
      if (item.landArea) parts.push(`участок ${String(item.landArea).replace(".", ",")} сот.`);
      if (item.houseFloors) parts.push(`${item.houseFloors} ${floorsWord(item.houseFloors)}`);
      return parts.join(" · ");
    }
    return [flatTypeLabel(item), formatAreaRu(item.area), `${item.floor}/${item.floorsTotal} этаж`].join(" · ");
  }

  // Продажа дома: газ · отопление · канализация (год постройки — в подписях к фото)
  function houseSaleTermsLine(item) {
    return [item.gas, item.heating, item.sewer].filter(Boolean).join(" · ");
  }

  // Продажа квартиры: ремонт и год ремонта (год пока сгенерирован, см. data.js) · мебель
  function saleTermsLine(item) {
    if (item.propertyType === "house") return houseSaleTermsLine(item);
    const repair = item.repairYear ? `${item.repair} ${item.repairYear} г.` : item.repair;
    return [repair, item.hasFurniture ? "С мебелью" : "Без мебели"].filter(Boolean).join(" · ");
  }

  // Аренда дома: вместо условий — инфраструктура участка (газ · отопление · вода · санузел в доме)
  function houseRentTermsLine(item) {
    return [item.gas, item.heating, item.water, item.toiletInside && "Санузел в доме"].filter(Boolean).join(" · ");
  }

  // Аренда квартиры: комиссия (clientFee — % от месячной цены), залог (и можно ли частями)
  function termsLine(item) {
    if (item.dealType === "sale") return saleTermsLine(item);
    if (item.propertyType === "house") return houseRentTermsLine(item);
    const parts = [item.clientFee ? `Комиссия ${item.clientFee}%` : "Без комиссии"];
    if (item.deposit) parts.push(`Залог ${formatPrice(item.deposit)}${item.depositByParts ? " (можно частями)" : ""}`);
    else if (item.deposit === 0) parts.push("Без залога");
    return parts.join(" · ");
  }

  function addressLine(item) {
    return [item.jk, item.address].filter(Boolean).join(", ");
  }

  // Строка контактов: есть имя — оно заголовок, роль подзаголовком; имени нет —
  // заголовком роль, без подзаголовка. У суперагента подзаголовок — «Суперагент».
  function sellerHtml(item) {
    const title = item.agency || item.sellerRole;
    let subtitle = "";
    if (item.isSuperAgent) subtitle = `<div class="card__seller-level">${ICONS.superAgent}Суперагент</div>`;
    else if (item.agency) subtitle = `<div class="card__seller-role">${item.sellerRole}</div>`;
    return `
      <div class="card__seller-text">
        <div class="card__seller-name">${title}</div>
        ${subtitle}
      </div>
    `;
  }

  function sellerInitials(name) {
    return name
      .replace(/[«»"]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  function transportHtml(item) {
    // Дома за городом — трасса и расстояние от КАД вместо метро
    if (item.propertyType === "house" && item.highway) {
      return `
      <div class="card__transport">
        <span class="card__transport-item">${ICONS.car}${item.highway} · ${item.highwayKm} км</span>
      </div>
    `;
    }
    if (!item.metro) return "";
    const color = item.metroColor ? `#${item.metroColor}` : "var(--text-secondary)";
    const timeIcon = item.metroTransport === "transport" ? ICONS.bus : ICONS.walk;
    return `
      <div class="card__transport">
        <span class="card__transport-item"><span class="card__metro-icon" style="color:${color}">${ICONS.pin}</span>${item.metro}</span>
        <span class="card__transport-item">${timeIcon}${item.metroMin} мин.</span>
      </div>
    `;
  }

  // Лейблы под фото: промо (с иконкой, капсула) + составной блок из сегментов.
  // Скругления сегментов (крайние 99px, внутренние 2px) задаются в CSS через :first/:last-child.
  function labelsHtml(item) {
    if (!item.promoLabel && item.labels.length === 0) return "";
    const promo = item.promoLabel
      ? `<span class="card__promo-label">${ICONS.crown}<span class="card__promo-label-text">${item.promoLabel}</span></span>`
      : "";
    const group = item.labels.length
      ? `<span class="card__label-group">${item.labels.map((l) => `<span class="card__label">${l}</span>`).join("")}</span>`
      : "";
    return `<div class="card__labels">${promo}${group}</div>`;
  }

  // Аренда — цена в месяц; продажа квартиры — цена и серым цена за м²; продажа дома — только цена
  function priceRowHtml(item) {
    if (item.dealType === "sale" && item.propertyType === "house") {
      return `<div class="card__price">${formatPrice(item.price)}</div>`;
    }
    if (item.dealType === "sale") {
      return `<div class="card__price">${formatPrice(item.price)}<span class="card__price-sqm">${formatPrice(item.pricePerSqm)}/м²</span></div>`;
    }
    return `<div class="card__price">${formatPrice(item.price)}/мес.</div>`;
  }

  function priceDeltaInfo(item) {
    const { mode, min, max } = computeResults();
    const v = priceMetric(item, mode);
    const isAbove = max != null && v > max;
    const bound = isAbove ? max : min;
    const pct = bound ? Math.round((Math.abs(v - bound) / bound) * 100) : 0;
    return { isAbove, pct: Math.max(pct, 1) };
  }

  function mixedDeltaHtml(item) {
    const { isAbove, pct } = priceDeltaInfo(item);
    return `<div class="card__delta">${isAbove ? "Дороже" : "Дешевле"} на ${pct}% чем вы искали</div>`;
  }

  function createCarouselCardEl(item) {
    const card = document.createElement("article");
    card.className = "mix-carousel__card";
    card.innerHTML = `
      <div class="mix-carousel__photo">
      </div>
      <div class="mix-carousel__body">
        <div class="mix-carousel__price">${formatPrice(item.price)}${item.dealType === "sale" ? "" : "/мес."}</div>
        <div class="mix-carousel__type">${item.propertyType === "house" ? item.houseKind : flatTypeLabel(item)} · ${formatAreaRu(item.area)}</div>
        <div class="mix-carousel__meta">${item.metro || ""}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      if (pinSheetRef.current) pinSheetRef.current.open(item);
    });
    return card;
  }

  function createMixCarouselEl(extras) {
    const wrap = document.createElement("div");
    wrap.className = "mix-carousel";
    wrap.innerHTML = `
      <div class="mix-carousel__header">
        <div class="mix-carousel__title">Доступно по схожей цене</div>
      </div>
      <div class="mix-carousel__track" data-role="track"></div>
    `;
    const track = wrap.querySelector('[data-role="track"]');
    extras.forEach((item) => track.appendChild(createCarouselCardEl(item)));
    return wrap;
  }

  // ---------- Галерея ----------
  // Фото листаются нативным горизонтальным скроллом со snap; без фото — серая плашка.
  // Иконка планировки слева внизу — только если в объявлении есть планировка
  // (она всегда вторым фото). Точек максимум 5, активная «едет» по центру, как на Циане.
  const MAX_DOTS = 5;

  function activeDotIndex(photoIndex, total) {
    const dots = Math.min(total, MAX_DOTS);
    if (total <= MAX_DOTS || photoIndex < 2) return photoIndex;
    if (photoIndex >= total - 2) return dots - (total - photoIndex);
    return 2;
  }

  function galleryHtml(item, { asis = false } = {}) {
    const total = Math.max(item.photos.length, 1);
    const dots = Math.min(total, MAX_DOTS);
    return `
      <div class="card__gallery">
        ${
          item.photos.length
            ? `<div class="card__gallery-track" data-role="track">${item.photos
                .map((photo, i) => {
                  // Планировка: флаг layout у фото, а у старых записей — просто 2-е фото при hasLayout
                  const isLayout = photo.layout || (item.hasLayout && i === 1 && !item.photos.some((p) => p.layout));
                  return `<img src="${encodeURI(photo.src)}" alt="${photo.caption || ""}"${isLayout ? ' class="is-layout"' : ""}${i > 0 ? ' loading="lazy"' : ""} />`;
                })
                .join("")}</div>
              ${asis ? "" : '<span class="card__gallery-caption" data-role="caption"></span>'}`
            : ""
        }
        <div class="card__gallery-actions">
          <button class="card__gallery-btn" type="button" aria-label="В избранное">${ICONS.heart}</button>
          <button class="card__gallery-btn" type="button" aria-label="Ещё">${ICONS.more}</button>
        </div>
        ${item.hasLayout && !asis ? `<button class="card__gallery-badge" type="button" aria-label="Показать планировку">${ICONS.layout}</button>` : ""}
        ${
          dots > 1 || !item.photos.length
            ? `<div class="card__gallery-dots">${Array.from({ length: item.photos.length ? dots : MAX_DOTS }, (_, i) => `<span class="card__gallery-dot${i === 0 ? " is-active" : ""}"></span>`).join("")}</div>`
            : ""
        }
      </div>
    `;
  }

  // Галерея стартует в 16:9 и по ходу свайпа к второму фото плавно вырастает до 1:1
  // (или до 4:3 — настройка «Галерея при свайпе» в панели прототипа, ?gallery=4x3).
  // Высота считается прямо из scrollLeft (доля пути между 1-м и 2-м фото), поэтому
  // движение идёт ровно со скоростью пальца, а доводку делает нативный scroll-snap.
  // Дальше 2-го фото галерея остаётся раскрытой, при возврате к 1-му — так же сжимается.
  const GALLERY_RATIO_START = 9 / 16;
  const GALLERY_RATIO_EXPANDED = window.App.session && window.App.session.gallery === "4x3" ? 3 / 4 : 1;

  // fixed — галерея не растёт при свайпе (у «Нового 2» она сразу 1:1);
  // captionOf(index) — своя подпись к фото (у «Нового 2» подписи для продажи квартир свои);
  // onPosition(position) — дополнительная реакция на листание.
  function setupGallery(card, item, { asis = false, fixed = asis, captionOf = null, onPosition = null } = {}) {
    const track = card.querySelector('[data-role="track"]');
    if (!track) return;
    const gallery = card.querySelector(".card__gallery");
    const dots = card.querySelectorAll(".card__gallery-dot");
    const caption = card.querySelector('[data-role="caption"]');
    // Иконка планировки «приклеена» к первому фото — уезжает вместе с ним при листании
    const layoutBadge = card.querySelector(".card__gallery-badge");
    // Тап по иконке — листаем галерею к первой планировке (плавно, со всеми эффектами свайпа)
    if (layoutBadge) {
      layoutBadge.addEventListener("click", (e) => {
        e.stopPropagation();
        const images = Array.from(track.children);
        const index = images.findIndex((img) => img.classList.contains("is-layout"));
        if (index > 0) track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
      });
    }

    // Подпись фото (со 2-го): текст берём у ближайшего фото, а прозрачность —
    // от того, насколько фото «доехало»: на середине свайпа подпись гаснет,
    // у нового фото проявляется уже с его текстом. Тоже идёт со скоростью пальца.
    function updateCaption(position) {
      if (!caption) return;
      const index = Math.max(0, Math.min(Math.round(position), item.photos.length - 1));
      const text = captionOf ? captionOf(index) : item.photos[index].caption;
      if (caption.textContent !== (text || "")) caption.textContent = text || "";
      const distance = Math.abs(position - index);
      caption.style.opacity = text ? String(Math.max(0, 1 - distance * 2.5)) : "0";
    }

    // Пересчитываем прямо в scroll-событии (оно и так приходит раз в кадр),
    // без лишнего requestAnimationFrame — иначе высота отстаёт от пальца на кадр.
    // Высоту округляем вниз до целых px (не выше ленты — без полоски фона), чтобы текст под галереей не дрожал на субпикселях.
    function update() {
      const width = track.clientWidth;
      if (!width) return;
      const position = track.scrollLeft / width;
      if (!fixed) {
        const progress = Math.min(Math.max(position, 0), 1);
        const ratio = GALLERY_RATIO_START + (GALLERY_RATIO_EXPANDED - GALLERY_RATIO_START) * progress;
        gallery.style.height = `${Math.floor(width * ratio)}px`;
      }

      const active = activeDotIndex(Math.round(position), item.photos.length);
      dots.forEach((d, i) => d.classList.toggle("is-active", i === active));
      updateCaption(position);
      if (layoutBadge) layoutBadge.style.transform = `translateX(${-track.scrollLeft}px)`;
      if (onPosition) onPosition(position);
    }

    track.addEventListener("scroll", update, { passive: true });

    // Лог: кадр, на котором человек остановился (после 0,5 с без движения)
    let loggedIndex = 0;
    let settleTimer = 0;
    track.addEventListener(
      "scroll",
      () => {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          const index = Math.round(track.scrollLeft / track.clientWidth);
          if (index === loggedIndex || !window.App.track) return;
          loggedIndex = index;
          const photo = item.photos[index] || {};
          const isLayout = track.children[index] && track.children[index].classList.contains("is-layout");
          window.App.track(isLayout ? "Фото: планировка" : "Фото", {
            item,
            value: `${index + 1}/${item.photos.length}${photo.caption ? ` · ${photo.caption}` : ""}`,
          });
        }, 500);
      },
      { passive: true }
    );

    setupMouseDrag(track);
  }

  // ---------- Перетаскивание галереи мышью ----------
  // Пальцем и трекпадом лента листается нативным скроллом, а мышью браузер
  // overflow-контейнеры не тащит — эмулируем: ведём scrollLeft за курсором,
  // на отпускании доводим до ближайшего фото, а при быстром броске — до следующего.
  const FLICK_VELOCITY = 0.4; // px/мс

  function setupMouseDrag(track) {
    let drag = null;

    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { startX: e.clientX, startLeft: track.scrollLeft, lastX: e.clientX, lastT: e.timeStamp, velocity: 0, moved: false };
      track.style.scrollSnapType = "none";
      track.style.scrollBehavior = "auto";
      track.setPointerCapture(e.pointerId);
      track.classList.add("is-dragging");
    });

    track.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dt = e.timeStamp - drag.lastT;
      if (dt > 0) drag.velocity = (e.clientX - drag.lastX) / dt;
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
      if (Math.abs(e.clientX - drag.startX) > 3) drag.moved = true;
      track.scrollLeft = drag.startLeft - (e.clientX - drag.startX);
    });

    function finish() {
      if (!drag) return;
      const width = track.clientWidth;
      const position = track.scrollLeft / width;
      let index = Math.round(position);
      if (Math.abs(drag.velocity) > FLICK_VELOCITY) {
        index = drag.velocity < 0 ? Math.ceil(position) : Math.floor(position);
      }
      index = Math.max(0, Math.min(index, track.children.length - 1));
      if (drag.moved) {
        track.dataset.justDragged = "1";
        setTimeout(() => delete track.dataset.justDragged, 0);
      }
      drag = null;
      track.classList.remove("is-dragging");
      track.scrollTo({ left: index * width, behavior: "smooth" });
      // Возвращаем нативный snap после доводки — иначе он оборвёт плавную анимацию
      window.setTimeout(() => {
        track.style.scrollSnapType = "";
        track.style.scrollBehavior = "";
      }, 450);
    }

    track.addEventListener("pointerup", finish);
    track.addEventListener("pointercancel", finish);
    // Картинки не должны уезжать как файлы при перетаскивании
    track.addEventListener("dragstart", (e) => e.preventDefault());
  }

  function createCardEl(item, mixed, showDelta = mixed) {
    if (window.App.session && window.App.session.variant === "asis") return createAsisCardEl(item);
    if (window.App.session && window.App.session.variant === "new2") return createNew2CardEl(item);
    const card = document.createElement("article");
    card.className = "card" + (mixed ? " card--mixed" : "");
    card.dataset.listingId = item.id;
    const seller = item.agency || item.sellerRole;

    card.innerHTML = `
      ${galleryHtml(item)}
      ${labelsHtml(item)}
      <div class="card__info">
        ${priceRowHtml(item)}
        ${showDelta ? mixedDeltaHtml(item) : ""}
        <div class="card__params">${paramsLine(item)}</div>
        <div class="card__terms">${termsLine(item)}</div>
        <div class="card__address">${addressLine(item)}</div>
        ${transportHtml(item)}
      </div>
      <div class="card__footer">
        <div class="card__seller">
          ${
            item.avatar
              ? `<div class="card__avatar card__avatar--image"><img src="${encodeURI(item.avatar)}" alt="" loading="lazy" /></div>`
              : `<div class="card__avatar">${sellerInitials(seller)}</div>`
          }
          ${sellerHtml(item)}
        </div>
        <button class="card__btn card__btn--call" type="button" aria-label="Позвонить">${ICONS.phone}</button>
        <button class="card__btn card__btn--message" type="button">Написать</button>
      </div>
    `;
    setupGallery(card, item);
    setupCardTracking(card, item);
    return card;
  }


  // ---------- Вариант «как сейчас» (?variant=asis) — текущий сниппет Циана для сравнения ----------
  // Продавец сверху, галерея статичная 16:9 без подписей и иконки планировки, цветные лейблы,
  // заголовок, цена, параметры, ЖК, адрес, транспорт и две большие кнопки. Условий сделки,
  // ремонта, цены за м², инженерки и типа дома здесь нет — именно это и сравниваем с новым.
  function asisRole(item) {
    if (item.sellerRole === "Агентство") return "Агентство недвижимости";
    return item.sellerRole;
  }

  function asisParamsLine(item) {
    if (item.propertyType === "house") {
      const parts = ["Дом", formatAreaRu(item.area)];
      if (item.landArea) parts.push(`${String(item.landArea).replace(".", ",")} сот.`);
      return parts.join(" · ");
    }
    return paramsLine(item);
  }

  function asisAddress(item) {
    if (item.propertyType === "house") return `${item.locality}, Ленинградская область`;
    return `${[item.street, item.house].filter(Boolean).join(", ")}, Санкт-Петербург`;
  }

  function asisTransportHtml(item) {
    if (item.propertyType === "house" && item.highway) {
      return `
      <div class="card__transport">
        <span class="card__transport-item">${ICONS.car}${item.highway}</span>
        <span class="card__transport-item">${item.highwayKm} км от КАД</span>
      </div>
    `;
    }
    return transportHtml(item);
  }

  // Лейблы как сейчас: цветные капсулы (суперагент/собственник — зелёные, мебель — оранжевая)
  function asisLabelsHtml(item) {
    const chips = [];
    const GOOD_PRICE = "Хорошая цена";
    if (item.labels.includes(GOOD_PRICE)) chips.push(`<span class="asis__chip">${GOOD_PRICE}</span>`);
    if (item.isSuperAgent) chips.push(`<span class="asis__chip asis__chip--green">${ICONS.superAgent}Суперагент</span>`);
    if (item.isByHomeowner) chips.push('<span class="asis__chip asis__chip--green">Собственник</span>');
    if (item.hasFurniture) chips.push('<span class="asis__chip asis__chip--orange">С мебелью</span>');
    item.labels.filter((l) => l !== GOOD_PRICE).forEach((l) => chips.push(`<span class="asis__chip">${l}</span>`));
    return chips.length ? `<div class="card__labels asis__labels">${chips.join("")}</div>` : "";
  }

  function createAsisCardEl(item) {
    const card = document.createElement("article");
    card.className = "card card--asis";
    card.dataset.listingId = item.id;
    const seller = item.agency || item.sellerRole;
    const price = `${formatPrice(item.price)}${item.dealType === "rent" ? "/мес." : ""}`;

    card.innerHTML = `
      <div class="asis__seller">
        ${
          item.avatar
            ? `<div class="asis__avatar"><img src="${encodeURI(item.avatar)}" alt="" loading="lazy" /></div>`
            : `<div class="asis__avatar">${sellerInitials(seller)}</div>`
        }
        <div class="asis__seller-text">
          <div class="asis__seller-name">${seller}${item.sellerRole === "Агентство" ? `<span class="asis__verified">${ICONS.check}</span>` : ""}</div>
          ${item.agency ? `<div class="asis__seller-role">${asisRole(item)}</div>` : ""}
        </div>
      </div>
      ${galleryHtml(item, { asis: true })}
      ${asisLabelsHtml(item)}
      <div class="card__info">
        ${item.promoLabel ? `<div class="card__params asis__title">${item.promoLabel}</div>` : ""}
        <div class="card__price">${price}</div>
        <div class="card__params">${asisParamsLine(item)}</div>
        ${item.jk ? `<div class="card__terms">${item.jk}</div>` : ""}
        <div class="card__address">${asisAddress(item)}</div>
        ${asisTransportHtml(item)}
      </div>
      <div class="asis__buttons">
        <button class="card__btn card__btn--call asis__btn asis__btn--call" type="button">${ICONS.phone}Позвонить</button>
        <button class="card__btn card__btn--message asis__btn asis__btn--message" type="button">${ICONS.message}Написать</button>
      </div>
    `;
    setupGallery(card, item, { asis: true });
    setupCardTracking(card, item);
    return card;
  }

  // ---------- Вариант «Новый 2» (?variant=new2) — экспериментальный сниппет ----------
  // Галерея на всю ширину и сразу 1:1. Подпись — белой капсулой слева сверху, справа сверху
  // «в избранное» и «поделиться». Справа снизу миниатюры планировки и карты: тап показывает
  // планировку или карту поверх фото, миниатюра становится крестиком, крестик возвращает к тому
  // же фото. Миниатюра планировки прячется, когда до планировки долистали сами. Под фото —
  // капсулы лейблов. У продажи квартир нет строки «ремонт · мебель»: мебель ушла в подписи к
  // фото (captionsNew2 в data.js). Внизу только роль продавца и три кнопки-иконки.
  const STATIC_MAP = "https://static-maps.yandex.ru/1.x/?l=map&lang=ru_RU";

  // Статичная карта Яндекса (без ключа); картинку берём крупнее места на экране, чтобы надписи были мелкими
  function staticMapUrl(item, size, zoom) {
    return `${STATIC_MAP}&ll=${item.lon},${item.lat}&z=${zoom}&size=${size},${size}`;
  }

  function layoutPhoto(item) {
    const index = item.photos.findIndex((p, i) => p.layout || (item.hasLayout && i === 1 && !item.photos.some((x) => x.layout)));
    return index >= 0 ? { index, src: item.photos[index].src } : null;
  }

  function new2Caption(item, index) {
    const own = item.captionsNew2 && item.captionsNew2[index + 1];
    return own || item.photos[index].caption;
  }

  function new2GalleryHtml(item) {
    const total = item.photos.length;
    const dots = Math.min(total, MAX_DOTS);
    const layout = layoutPhoto(item);
    const thumb = (kind, label, img) => `
      <button class="n2__thumb n2__control" type="button" data-thumb="${kind}" aria-label="${label}">
        ${img}
        <span class="n2__thumb-close">${ICONS.close}</span>
      </button>`;
    return `
      <div class="card__gallery n2__gallery">
        <div class="card__gallery-track" data-role="track">${item.photos
          .map((photo, i) => `<img src="${encodeURI(photo.src)}" alt=""${layout && i === layout.index ? ' class="is-layout"' : ""}${i > 0 ? ' loading="lazy"' : ""} />`)
          .join("")}</div>
        <div class="n2__overlay n2__control" data-role="overlay" hidden></div>
        <span class="n2__caption" data-role="caption"></span>
        <div class="n2__actions">
          <button class="n2__round n2__control" type="button" data-role="share" aria-label="Поделиться">${ICONS.share}</button>
          <button class="card__gallery-btn n2__round n2__control" type="button" aria-label="В избранное">${ICONS.heart}</button>
        </div>
        <div class="n2__thumbs">
          ${layout ? thumb("layout", "Показать планировку", `<img class="n2__thumb-img n2__thumb-img--layout" src="${encodeURI(layout.src)}" alt="" loading="lazy" />`) : ""}
          ${thumb("map", "Показать на карте", `<img class="n2__thumb-img n2__thumb-img--map" src="${staticMapUrl(item, 160, 15)}" alt="" loading="lazy" /><span class="n2__thumb-pin">${ICONS.mapPin}</span>`)}
        </div>
        ${dots > 1 ? `<div class="card__gallery-dots">${Array.from({ length: dots }, (_, i) => `<span class="card__gallery-dot${i === 0 ? " is-active" : ""}"></span>`).join("")}</div>` : ""}
      </div>
    `;
  }

  function new2LabelsHtml(item) {
    if (!item.promoLabel && item.labels.length === 0) return "";
    const promo = item.promoLabel ? `<span class="n2__chip">${ICONS.crownNew2}${item.promoLabel}</span>` : "";
    return `<div class="card__labels n2__labels">${promo}${item.labels.map((l) => `<span class="n2__chip">${l}</span>`).join("")}</div>`;
  }

  function new2RoleHtml(item) {
    if (item.isSuperAgent) return `<div class="n2__role n2__role--super">${ICONS.superAgent}Суперагент</div>`;
    return `<div class="n2__role">${item.sellerRole}</div>`;
  }

  // ---------- Зум пальцами («Новый 2») ----------
  const touchDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const touchMid = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const MAX_ZOOM = 4;

  // Фото в ленте — как в Инстаграме: щипок увеличивает кадр, пока пальцы на экране,
  // отпустили — плавно возвращается. Листание одним пальцем не трогаем.
  function setupPhotoPinch(track) {
    let pinch = null;
    track.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 2) return;
        const img = e.target.closest("img");
        if (!img) return;
        const [a, b] = e.touches;
        const rect = img.getBoundingClientRect();
        const mid = touchMid(a, b);
        pinch = { img, d0: touchDist(a, b), m0: mid };
        img.style.transition = "none";
        img.style.transformOrigin = `${mid.x - rect.left}px ${mid.y - rect.top}px`;
      },
      { passive: true }
    );
    track.addEventListener(
      "touchmove",
      (e) => {
        if (!pinch || e.touches.length < 2) return;
        e.preventDefault(); // иначе браузер зумит всю страницу или листает ленту
        const [a, b] = e.touches;
        const scale = clamp(touchDist(a, b) / pinch.d0, 1, MAX_ZOOM);
        const mid = touchMid(a, b);
        pinch.img.style.transform = `translate(${mid.x - pinch.m0.x}px, ${mid.y - pinch.m0.y}px) scale(${scale})`;
      },
      { passive: false }
    );
    const finish = (e) => {
      if (!pinch || e.touches.length >= 2) return;
      const { img } = pinch;
      pinch = null;
      img.style.transition = "transform 0.25s ease";
      img.style.transform = "";
    };
    track.addEventListener("touchend", finish);
    track.addEventListener("touchcancel", finish);
  }

  // Открытая планировка — зум остаётся: щипок или двойной тап увеличивают, одним пальцем
  // двигаем увеличенную планировку. Без увеличения горизонтальный свайп закрывает
  // планировку и листает к соседнему фото (onSwipe), как и раньше.
  function setupPlanZoom(box, img, { onSwipe }) {
    let scale = 1;
    let tx = 0;
    let ty = 0;
    let gesture = null;
    let lastTap = 0;

    function apply(animate) {
      const w = box.clientWidth;
      const h = box.clientHeight;
      scale = clamp(scale, 1, MAX_ZOOM);
      tx = clamp(tx, w - w * scale, 0);
      ty = clamp(ty, h - h * scale, 0);
      img.style.transition = animate ? "transform 0.25s ease" : "none";
      img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }

    function zoomAt(point, nextScale, animate) {
      // Точка плана под пальцем остаётся под пальцем
      const px = (point.x - tx) / scale;
      const py = (point.y - ty) / scale;
      scale = clamp(nextScale, 1, MAX_ZOOM);
      tx = point.x - px * scale;
      ty = point.y - py * scale;
      apply(animate);
    }

    const local = (p) => {
      const r = box.getBoundingClientRect();
      return { x: p.x - r.left, y: p.y - r.top };
    };

    img.style.transformOrigin = "0 0";
    box.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 2) {
          const [a, b] = e.touches;
          gesture = { type: "pinch", d0: touchDist(a, b), s0: scale, p: local(touchMid(a, b)), tx0: tx, ty0: ty };
          gesture.cx = (gesture.p.x - tx) / scale;
          gesture.cy = (gesture.p.y - ty) / scale;
        } else if (e.touches.length === 1) {
          const t = e.touches[0];
          gesture = { type: "pan", x0: t.clientX, y0: t.clientY, tx0: tx, ty0: ty, dx: 0, dy: 0 };
        }
      },
      { passive: true }
    );
    box.addEventListener(
      "touchmove",
      (e) => {
        if (!gesture) return;
        e.preventDefault();
        if (gesture.type === "pinch" && e.touches.length === 2) {
          const [a, b] = e.touches;
          const p = local(touchMid(a, b));
          scale = clamp((gesture.s0 * touchDist(a, b)) / gesture.d0, 1, MAX_ZOOM);
          tx = p.x - gesture.cx * scale;
          ty = p.y - gesture.cy * scale;
          apply(false);
        } else if (gesture.type === "pan" && e.touches.length === 1) {
          const t = e.touches[0];
          gesture.dx = t.clientX - gesture.x0;
          gesture.dy = t.clientY - gesture.y0;
          if (scale > 1) {
            tx = gesture.tx0 + gesture.dx;
            ty = gesture.ty0 + gesture.dy;
            apply(false);
          }
        }
      },
      { passive: false }
    );
    box.addEventListener("touchend", (e) => {
      if (!gesture || e.touches.length > 0) {
        // Из щипка остался один палец — дальше он двигает план
        if (gesture && gesture.type === "pinch" && e.touches.length === 1) {
          const t = e.touches[0];
          gesture = { type: "pan", x0: t.clientX, y0: t.clientY, tx0: tx, ty0: ty, dx: 0, dy: 0 };
        }
        return;
      }
      const g = gesture;
      gesture = null;
      if (g.type !== "pan") return;
      const moved = Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10;
      if (!moved) {
        // Двойной тап: приблизить в точку тапа / вернуть как было
        const now = Date.now();
        if (now - lastTap < 300) {
          lastTap = 0;
          if (scale > 1) {
            scale = 1;
            tx = 0;
            ty = 0;
            apply(true);
          } else zoomAt(local({ x: g.x0, y: g.y0 }), 2.5, true);
        } else lastTap = now;
        return;
      }
      if (scale === 1 && Math.abs(g.dx) > 40 && Math.abs(g.dx) > Math.abs(g.dy)) onSwipe(g.dx < 0 ? 1 : -1);
    });
  }

  // Подсветка комнаты на планировке: если планировку открыли с фото комнаты (например, санузла),
  // поверх плана — полупрозрачная фигура на месте этой комнаты (planRoomsNew2 в data.js)
  function planRoomsSvg(item, photoIndex) {
    const plan = item.planRoomsNew2;
    const keys = plan && plan.photos[photoIndex + 1];
    if (!keys) return "";
    const rects = keys
      .map((key) => {
        const [x1, y1, x2, y2] = plan.rooms[key];
        return `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" />`;
      })
      .join("");
    return `<svg class="n2__plan-rooms" viewBox="0 0 100 100" preserveAspectRatio="none">${rects}</svg>`;
  }

  // Планировка вписана целиком (как object-fit: contain) — подгоняем под неё блок,
  // чтобы фигуры комнат в процентах легли ровно на картинку, а не на всю область галереи
  function fitPlan(box) {
    const stage = box.querySelector(".n2__plan-fit");
    const img = stage.querySelector("img");
    const place = () => {
      const bw = box.clientWidth;
      const bh = box.clientHeight;
      const k = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
      const w = img.naturalWidth * k;
      const h = img.naturalHeight * k;
      Object.assign(stage.style, { left: `${(bw - w) / 2}px`, top: `${(bh - h) / 2}px`, width: `${w}px`, height: `${h}px` });
    };
    if (img.complete && img.naturalWidth) place();
    else img.addEventListener("load", place, { once: true });
  }

  function setupNew2Gallery(card, item) {
    const gallery = card.querySelector(".n2__gallery");
    const overlay = card.querySelector('[data-role="overlay"]');
    const thumbs = card.querySelectorAll(".n2__thumb");
    const layoutThumb = card.querySelector('[data-thumb="layout"]');
    const layout = layoutPhoto(item);
    const { track } = window.App;
    let mode = null; // null | "layout" | "map"
    let onLayoutSlide = false;
    let liveMap = null;

    function syncThumbs() {
      thumbs.forEach((t) => t.classList.toggle("is-close", t.dataset.thumb === mode));
      // До планировки долистали сами — её миниатюра не нужна
      if (layoutThumb) layoutThumb.hidden = onLayoutSlide && mode === null;
    }

    // Живая карта Яндекса: двигается и зумится, объект в центре с пином.
    // Пока API не загрузился (или недоступен) — статичная картинка того же места.
    function openLiveMap() {
      overlay.innerHTML = `<img class="n2__overlay-map" src="${staticMapUrl(item, 450, 16)}" alt="Карта" /><span class="n2__overlay-pin">${ICONS.mapPin}</span>`;
      if (typeof ymaps === "undefined") return;
      ymaps.ready(() => {
        if (mode !== "map") return;
        const holder = document.createElement("div");
        holder.className = "n2__overlay-live";
        overlay.appendChild(holder);
        liveMap = new ymaps.Map(holder, { center: [item.lat, item.lon], zoom: 16, controls: ["zoomControl"] }, { suppressMapOpenBlock: true });
        liveMap.geoObjects.add(
          new ymaps.Placemark([item.lat, item.lon], {}, {
            iconLayout: "default#image",
            // Как отдельная картинка SVG без xmlns не рисуется — добавляем
            iconImageHref: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ICONS.mapPin.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" '))}`,
            iconImageSize: [40, 40],
            iconImageOffset: [-20, -38],
          })
        );
      });
    }

    const photoIndex = () => {
      const trackEl = card.querySelector('[data-role="track"]');
      return Math.round(trackEl.scrollLeft / trackEl.clientWidth);
    };

    function show(next) {
      if (liveMap) {
        liveMap.destroy();
        liveMap = null;
      }
      mode = next;
      gallery.classList.toggle("is-overlay", Boolean(mode));
      // Карта ловит касания сама (двигать, зумить) — свайп галереи под ней не срабатывает
      // Карта и планировка ловят касания сами: карту двигают и зумят, планировку зумят пальцами
      overlay.classList.toggle("is-interactive", Boolean(mode));
      overlay.hidden = !mode;
      if (mode === "layout") {
        // .n2__plan — на всю область, его зумим; внутри .n2__plan-fit ровно по картинке плана
        overlay.innerHTML = `<div class="n2__plan"><div class="n2__plan-fit"><img class="n2__overlay-layout" src="${encodeURI(
          layout.src
        )}" alt="Планировка" />${planRoomsSvg(item, photoIndex())}</div></div>`;
        fitPlan(overlay);
        setupPlanZoom(overlay, overlay.firstElementChild, {
          // Свайп без увеличения — закрываем планировку и листаем к соседнему фото
          onSwipe: (dir) => {
            if (track) track("Свайпом закрыл планировку на фото", { item });
            const trackEl = card.querySelector('[data-role="track"]');
            const index = clamp(Math.round(trackEl.scrollLeft / trackEl.clientWidth) + dir, 0, trackEl.children.length - 1);
            show(null);
            trackEl.scrollTo({ left: index * trackEl.clientWidth, behavior: "smooth" });
          },
        });
      }
      else if (mode === "map") openLiveMap();
      else overlay.innerHTML = "";
      syncThumbs();
    }

    thumbs.forEach((t) =>
      t.addEventListener("click", (e) => {
        e.stopPropagation();
        const kind = t.dataset.thumb;
        const closing = mode === kind;
        if (track) track(closing ? `Закрыл ${kind === "map" ? "карту" : "планировку"} на фото` : `Миниатюра: ${kind === "map" ? "карта" : "планировка"}`, { item });
        show(closing ? null : kind);
      })
    );

    setupPhotoPinch(card.querySelector('[data-role="track"]'));
    // Safari на iOS зумит страницу своими gesture-событиями — внутри галереи отключаем
    gallery.addEventListener("gesturestart", (e) => e.preventDefault());

    setupGallery(card, item, {
      fixed: true,
      captionOf: (index) => new2Caption(item, index),
      onPosition: (position) => {
        const now = Boolean(layout) && Math.round(position) === layout.index;
        if (now !== onLayoutSlide) {
          onLayoutSlide = now;
          syncThumbs();
        }
      },
    });
  }

  function setupNew2Actions(card, item) {
    const { track, openInfoStub } = window.App;
    const heart = card.querySelector('.n2__round[aria-label="В избранное"]');
    heart.addEventListener("click", (e) => {
      e.stopPropagation();
      const active = heart.classList.toggle("is-active");
      heart.innerHTML = active ? ICONS.heartFilled : ICONS.heart;
    });

    // Телефон — нативное меню «Поделиться»; десктоп (или если платформа его не пускает) — заглушка
    card.querySelector('[data-role="share"]').addEventListener("click", (e) => {
      e.stopPropagation();
      if (track) track("Поделиться", { item });
      const stub = () => openInfoStub && openInfoStub({ title: "Поделиться", text: "Здесь на телефоне откроется системное меню «Поделиться»." });
      const isPhone = window.matchMedia("(pointer: coarse)").matches;
      if (isPhone && navigator.share) {
        navigator.share({ title: "Объявление на Циан", url: window.location.href }).catch((err) => {
          if (err && err.name !== "AbortError") stub();
        });
      } else stub();
    });

    card.querySelector(".n2__btn--more").addEventListener("click", (e) => {
      e.stopPropagation();
      if (track) track("Меню «…» под сниппетом", { item });
      if (openInfoStub) openInfoStub({ title: "Ещё", text: "Здесь будет меню действий с объявлением." });
    });
  }

  function createNew2CardEl(item) {
    const card = document.createElement("article");
    card.className = "card card--n2";
    card.dataset.listingId = item.id;
    // Строку «ремонт · мебель» у продажи квартир убрали — мебель теперь в подписях к фото
    const showTerms = !(item.dealType === "sale" && item.propertyType === "flat");

    card.innerHTML = `
      ${new2GalleryHtml(item)}
      ${new2LabelsHtml(item)}
      <div class="card__info">
        ${priceRowHtml(item)}
        <div class="card__params">${paramsLine(item)}</div>
        ${showTerms ? `<div class="card__terms">${termsLine(item)}</div>` : ""}
        <div class="card__address">${addressLine(item)}</div>
        ${transportHtml(item)}
      </div>
      <div class="card__footer">
        ${new2RoleHtml(item)}
        <button class="card__btn n2__btn n2__btn--more" type="button" aria-label="Ещё">${ICONS.more}</button>
        <button class="card__btn card__btn--message n2__btn n2__btn--accent" type="button" aria-label="Написать">${ICONS.message}</button>
        <button class="card__btn card__btn--call n2__btn n2__btn--accent" type="button" aria-label="Позвонить">${ICONS.phone}</button>
      </div>
    `;
    setupNew2Gallery(card, item);
    setupNew2Actions(card, item);
    setupCardTracking(card, item);
    return card;
  }

  // ---------- Логи UX-теста: открытие карточки, прокрутка лейблов, показ сниппета ----------
  // Тап по сниппету (кроме кнопок и контролов галереи) = «открыл карточку». Карточки в
  // прототипе нет — показываем заглушку, чтобы респондент вернулся к выдаче (см. card-stub).
  const CARD_CONTROLS = ".card__btn, .card__gallery-btn, .card__gallery-badge, .card__labels, .n2__control";

  function setupCardTracking(card, item) {
    const { track, observeSnippet, openCardStub } = window.App;
    if (observeSnippet) observeSnippet(card);
    card.addEventListener("click", (e) => {
      if (e.target.closest(CARD_CONTROLS)) return;
      const trackEl = card.querySelector('[data-role="track"]');
      if (trackEl && trackEl.dataset.justDragged) return; // это был свайп мышью, а не тап
      if (track) track("Открыл карточку", { item });
      if (openCardStub) openCardStub(item);
    });
    const labels = card.querySelector(".card__labels");
    if (labels && track) {
      let logged = false;
      labels.addEventListener(
        "scroll",
        () => {
          if (logged) return;
          logged = true;
          track("Прокрутил лейблы", { item });
        },
        { passive: true }
      );
    }
  }

  function renderEmptyState(container, message) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state__title">${message}</div>
      <p class="empty-state__hint">Попробуйте расширить параметры поиска или сбросить фильтры.</p>
    `;
    container.appendChild(empty);
  }

  window.App = window.App || {};
  Object.assign(window.App, { createCarouselCardEl, createMixCarouselEl, createCardEl, renderEmptyState });
})();
