(function () {
  const { ICONS, formatPrice, formatArea, priceMetric, computeResults, pinSheetRef } = window.App;

  const PHOTO_COUNT = 40;

  function photoIndexForItem(item, offset) {
    const n = parseInt(item.id.replace(/\D/g, ""), 10) || 0;
    return ((n + offset * 7) % PHOTO_COUNT) + 1;
  }

  function photoUrl(idx) {
    return `photos/office-${String(idx).padStart(2, "0")}.jpg`;
  }

  // file:// URLs can hit the browser's concurrent-connection cap when many
  // large images load at once, causing a broken-image icon; retry once.
  function retryImg(event) {
    const img = event.target;
    const src = img.src;
    img.src = "";
    setTimeout(() => {
      img.src = src;
    }, 400);
  }

  // Карточки собираются через innerHTML-шаблоны (см. ниже) — после вставки в DOM
  // навешиваем ретрай на все найденные <img>, а не через инлайновый onerror=.
  function attachImageRetry(root) {
    root.querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", retryImg, { once: true });
    });
  }

  function priceRowHtml(item) {
    return `
      <div class="card__price-row">
        <span class="card__price">${formatPrice(item.price)}/мес.</span>
      </div>
    `;
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
        <img src="${photoUrl(photoIndexForItem(item, 0))}" alt="" loading="lazy" />
      </div>
      <div class="mix-carousel__body">
        <div class="mix-carousel__price">${formatPrice(item.price)}/мес.</div>
        <div class="mix-carousel__type">Офис · ${formatArea(item.area)}</div>
        <div class="mix-carousel__meta">${item.metro}</div>
      </div>
    `;
    attachImageRetry(card);
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

  function createCardEl(item, mixed, showDelta = mixed) {
    const card = document.createElement("article");
    card.className = "card" + (mixed ? " card--mixed" : "");

    const badges = [];
    if (item.isSuperagent) badges.push(`<span class="badge badge--positive">${ICONS.superAgent}Суперагент</span>`);
    if (item.onlyOnCian) badges.push(`<span class="badge badge--main">Только на Циане</span>`);

    const initials = item.agency
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    card.innerHTML = `
      <div class="card__seller">
        <div class="card__logo">${initials}</div>
        <div class="card__seller-text">
          <div class="card__seller-name">${item.agency}${item.isAgency ? ICONS.check : ""}</div>
          <div class="card__seller-role">${item.isAgency ? "Агентство недвижимости" : "Собственник"}</div>
        </div>
      </div>
      <div class="card__gallery">
        <div class="card__photo">
          <img src="${photoUrl(photoIndexForItem(item, 0))}" alt="" loading="lazy" />
          <div class="card__photo-fav">${ICONS.heart}</div>
        </div>
        <div class="card__thumbs">
          ${[1, 2, 3]
            .map((i) => `<div class="card__thumb"><img src="${photoUrl(photoIndexForItem(item, i))}" alt="" loading="lazy" /></div>`)
            .join("")}
        </div>
      </div>
      ${badges.length ? `<div class="card__badges">${badges.join("")}</div>` : ""}
      <div>
        ${priceRowHtml(item)}
        ${showDelta ? mixedDeltaHtml(item) : ""}
        <div class="card__meta" style="margin-top:4px">Офис · ${formatArea(item.area)} · ${item.floor}/${item.floorsTotal} этаж</div>
        <div class="card__address" style="margin-top:4px">${item.address}, Санкт-Петербург</div>
        <div class="card__transport" style="margin-top:6px">
          <span class="card__transport-item">${ICONS.pin}${item.metro}</span>
          <span class="card__transport-item">${ICONS.walk}${item.metroWalkMin} мин.</span>
        </div>
      </div>
      <div class="card__buttons">
        <button class="card__btn card__btn--call">${ICONS.phone}Позвонить</button>
        <button class="card__btn card__btn--message">${ICONS.message}Написать</button>
      </div>
    `;
    attachImageRetry(card);
    return card;
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
