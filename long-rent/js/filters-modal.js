(function () {
  const {
    LISTINGS,
    state,
    ui,
    formatInt,
    pluralize,
    computeMixSuggestion,
    getSeatingType,
    buildPriceWidget,
    createOverlayController,
    wireSingleSelectChips,
    wireMultiToggleChips,
    activeChip,
    activeChips,
    renderResults,
  } = window.App;

// ---------- Полноэкранная модалка «Фильтры» ----------
function setupFiltersModal() {
  const overlay = createOverlayController(document.getElementById("modal-backdrop"), document.getElementById("filters-modal"));
  let draft;
  let priceWidget;
  let variant = "histogram";

  const areaMinEl = document.getElementById("f-area-min");
  const areaMaxEl = document.getElementById("f-area-max");
  const floorMinEl = document.getElementById("f-floor-min");
  const floorMaxEl = document.getElementById("f-floor-max");
  const classChips = Array.from(document.querySelectorAll(".f-class-chip"));
  const footerCountEl = document.getElementById("f-footer-count");
  const expandSnackEl = document.getElementById("f-expand-snack");
  const expandSnackTextEl = document.getElementById("f-expand-snack-text");
  const expandSnackBtn = document.getElementById("f-expand-snack-btn");
  let pendingExpand = null;

  function showExpandSnack(n, mode, expandedMin, expandedMax) {
    pendingExpand = { mode, min: expandedMin, max: expandedMax };
    expandSnackTextEl.textContent = `Давайте немного расширим диапазон цены, в выдачу добавится ещё ${n} ${pluralize(n, "объект", "объекта", "объектов")}`;
    expandSnackEl.hidden = false;
  }

  function hideExpandSnack() {
    pendingExpand = null;
    expandSnackEl.hidden = true;
  }

  expandSnackBtn.addEventListener("click", () => {
    if (!pendingExpand) return;
    priceWidget.setRange(pendingExpand.mode, pendingExpand.min, pendingExpand.max);
  });

  const areaModeToggle = document.getElementById("f-area-mode-toggle");
  const areaModeButtons = Array.from(areaModeToggle.querySelectorAll("[data-area-mode]"));
  const areaPanels = Array.from(document.querySelectorAll("[data-area-panel]"));
  const peopleMinEl = document.getElementById("f-people-min");
  const peopleMaxEl = document.getElementById("f-people-max");
  const seatingSelectEl = document.getElementById("f-seating-select");
  const optimalAreaEl = document.getElementById("f-optimal-area");

  // Флаг предотвращает обратный пересчёт при программной записи значения в
  // «противоположные» поля (кол-во чел. <-> м²) — синхронизация идёт в одну
  // сторону за раз, от того поля, которое реально редактирует пользователь.
  let areaSyncing = false;

  function currentSeatingType() {
    return getSeatingType(seatingSelectEl.value);
  }

  function setAreaMode(mode) {
    areaModeButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.areaMode === mode));
    areaPanels.forEach((panel) => {
      panel.hidden = panel.dataset.areaPanel !== mode;
    });
  }

  function updateOptimalArea() {
    const pMin = peopleMinEl.value ? Number(peopleMinEl.value) : null;
    const pMax = peopleMaxEl.value ? Number(peopleMaxEl.value) : null;
    if (pMin == null && pMax == null) {
      optimalAreaEl.textContent = "0";
      return;
    }
    const type = currentSeatingType();
    const count = pMax ?? pMin;
    const perPerson = (type.perPersonMin + type.perPersonMax) / 2;
    optimalAreaEl.textContent = formatInt(Math.round(count * perPerson));
  }

  // Кол-во чел. -> м²: диапазон расширяется на весь разброс площади на человека
  // у выбранного типа рассадки (напр. «Плотная 6» -> от 4×чел. до 6×чел., а не чел.×6).
  function syncAreaFromPeople() {
    if (areaSyncing) return;
    areaSyncing = true;
    const type = currentSeatingType();
    const pMin = peopleMinEl.value ? Number(peopleMinEl.value) : null;
    const pMax = peopleMaxEl.value ? Number(peopleMaxEl.value) : null;
    areaMinEl.value = pMin != null ? Math.round(pMin * type.perPersonMin) : "";
    areaMaxEl.value = pMax != null ? Math.round(pMax * type.perPersonMax) : "";
    areaSyncing = false;
  }

  // м² -> Кол-во чел.: обратный пересчёт тем же диапазоном разброса.
  function syncPeopleFromArea() {
    if (areaSyncing) return;
    areaSyncing = true;
    const type = currentSeatingType();
    const aMin = areaMinEl.value ? Number(areaMinEl.value) : null;
    const aMax = areaMaxEl.value ? Number(areaMaxEl.value) : null;
    peopleMinEl.value = aMin != null ? Math.ceil(aMin / type.perPersonMax) : "";
    peopleMaxEl.value = aMax != null ? Math.floor(aMax / type.perPersonMin) : "";
    areaSyncing = false;
  }

  areaModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setAreaMode(btn.dataset.areaMode));
  });

  peopleMinEl.addEventListener("input", () => {
    syncAreaFromPeople();
    updateOptimalArea();
    computeDraftCount();
  });
  peopleMaxEl.addEventListener("input", () => {
    syncAreaFromPeople();
    updateOptimalArea();
    computeDraftCount();
  });
  seatingSelectEl.addEventListener("change", () => {
    syncAreaFromPeople();
    updateOptimalArea();
    computeDraftCount();
  });

  const dealChips = Array.from(document.querySelectorAll(".f-deal-chip"));
  const propertyTypeChips = Array.from(document.querySelectorAll(".f-ptype-chip"));
  const subtypeChips = Array.from(document.querySelectorAll(".f-subtype-chip"));
  const commercialBlock = document.getElementById("f-commercial-block");

  function draftIsCanonicalScope() {
    const deal = activeChip(dealChips)?.dataset.deal;
    const ptype = activeChip(propertyTypeChips)?.dataset.ptype;
    const subtypes = activeChips(subtypeChips).map((c) => c.dataset.subtype);
    return deal === "rent" && ptype === "commercial" && subtypes.length === 1 && subtypes[0] === "office";
  }

  // Черновая выборка без учёта цены — на неё накладывается диапазон цены
  // отдельно через computeMixSuggestion, чтобы посчитать заодно и «подмешивание»
  // (сколько объектов добавит расширение диапазона) для снека «Расширить».
  function computeDraftBase() {
    if (!draftIsCanonicalScope()) return [];
    return LISTINGS.filter((item) => {
      const areaMin = areaMinEl.value ? Number(areaMinEl.value) : null;
      const areaMax = areaMaxEl.value ? Number(areaMaxEl.value) : null;
      const floorMin = floorMinEl.value ? Number(floorMinEl.value) : null;
      const floorMax = floorMaxEl.value ? Number(floorMaxEl.value) : null;
      if (areaMin != null && item.area < areaMin) return false;
      if (areaMax != null && item.area > areaMax) return false;
      if (floorMin != null && item.floor < floorMin) return false;
      if (floorMax != null && item.floor > floorMax) return false;
      const activeClasses = activeChips(classChips).map((c) => c.dataset.class);
      if (activeClasses.length > 0 && !activeClasses.includes(item.officeClass)) return false;
      return true;
    });
  }

  function computeDraftCount() {
    if (!draftIsCanonicalScope()) {
      footerCountEl.textContent = "0 объявлений";
      hideExpandSnack();
      return;
    }
    const base = computeDraftBase();
    const mode = draft.priceMode;
    const { min, max } = draft.price[mode];
    const { strict, extrasTotal, expandedMin, expandedMax } = computeMixSuggestion(base, mode, min, max);
    const n = strict.length;
    footerCountEl.textContent = `${n} ${pluralize(n, "объявление", "объявления", "объявлений")}`;
    if (ui.mixMode === "filter-warning" && extrasTotal > 0) {
      showExpandSnack(extrasTotal, mode, expandedMin, expandedMax);
    } else {
      hideExpandSnack();
    }
  }

  // Площадь/этаж/класс редактируются здесь как черновик (см. computeDraftBase) —
  // при включённой ui.histogramAdaptive гистограмма и плейсхолдеры цены должны
  // реагировать на них сразу, а не только после «Применить», поэтому наряду с
  // computeDraftCount() дёргаем и сам виджет цены.
  function refreshAdaptiveHistogram() {
    if (ui.histogramAdaptive && priceWidget) priceWidget.updateUI();
  }

  areaMinEl.addEventListener("input", () => {
    syncPeopleFromArea();
    updateOptimalArea();
    computeDraftCount();
    refreshAdaptiveHistogram();
  });
  areaMaxEl.addEventListener("input", () => {
    syncPeopleFromArea();
    updateOptimalArea();
    computeDraftCount();
    refreshAdaptiveHistogram();
  });
  floorMinEl.addEventListener("input", () => {
    computeDraftCount();
    refreshAdaptiveHistogram();
  });
  floorMaxEl.addEventListener("input", () => {
    computeDraftCount();
    refreshAdaptiveHistogram();
  });
  wireMultiToggleChips(classChips, () => {
    computeDraftCount();
    refreshAdaptiveHistogram();
  });
  wireSingleSelectChips(dealChips, computeDraftCount);
  wireMultiToggleChips(subtypeChips, computeDraftCount);
  wireSingleSelectChips(propertyTypeChips, () => {
    commercialBlock.style.display = activeChip(propertyTypeChips)?.dataset.ptype === "commercial" ? "" : "none";
    computeDraftCount();
  });

  function open(scrollToPrice) {
    draft = { priceMode: state.priceMode, price: { total: { ...state.price.total }, perSqm: { ...state.price.perSqm } } };
    areaMinEl.value = state.areaMin ?? "";
    areaMaxEl.value = state.areaMax ?? "";
    floorMinEl.value = state.floorMin ?? "";
    floorMaxEl.value = state.floorMax ?? "";
    seatingSelectEl.value = "any";
    setAreaMode("people");
    syncPeopleFromArea();
    updateOptimalArea();
    classChips.forEach((chip) => chip.classList.toggle("is-active", state.classes.has(chip.dataset.class)));
    dealChips.forEach((chip) => chip.classList.toggle("is-active", chip.dataset.deal === state.dealType));
    propertyTypeChips.forEach((chip) => chip.classList.toggle("is-active", chip.dataset.ptype === state.propertyType));
    subtypeChips.forEach((chip) => chip.classList.toggle("is-active", state.subtypes.has(chip.dataset.subtype)));
    commercialBlock.style.display = state.propertyType === "commercial" ? "" : "none";

    priceWidget = buildPriceWidget(document.getElementById("f-price-widget"), {
      draft,
      onChange: computeDraftCount,
      priceVariant: variant,
      getAdaptiveBase: computeDraftBase,
    });
    computeDraftCount();

    overlay.open();
    if (scrollToPrice) {
      requestAnimationFrame(() => {
        document.getElementById("f-price-section").scrollIntoView({ block: "start" });
      });
    } else {
      document.querySelector(".filters-modal__body").scrollTop = 0;
    }
  }

  function close() {
    overlay.close();
    hideExpandSnack();
  }

  function apply() {
    state.priceMode = draft.priceMode;
    state.price.total = { ...draft.price.total };
    state.price.perSqm = { ...draft.price.perSqm };
    state.areaMin = areaMinEl.value ? Number(areaMinEl.value) : null;
    state.areaMax = areaMaxEl.value ? Number(areaMaxEl.value) : null;
    state.floorMin = floorMinEl.value ? Number(floorMinEl.value) : null;
    state.floorMax = floorMaxEl.value ? Number(floorMaxEl.value) : null;
    state.classes = new Set(activeChips(classChips).map((c) => c.dataset.class));
    state.dealType = activeChip(dealChips)?.dataset.deal ?? null;
    state.propertyType = activeChip(propertyTypeChips)?.dataset.ptype ?? null;
    state.subtypes = new Set(activeChips(subtypeChips).map((c) => c.dataset.subtype));
    close();
    renderResults();
  }

  function resetDraft() {
    priceWidget.reset();
    areaMinEl.value = "";
    areaMaxEl.value = "";
    floorMinEl.value = "";
    floorMaxEl.value = "";
    seatingSelectEl.value = "any";
    peopleMinEl.value = "";
    peopleMaxEl.value = "";
    updateOptimalArea();
    classChips.forEach((chip) => chip.classList.remove("is-active"));
    computeDraftCount();
  }

  document.getElementById("filters-modal-close").addEventListener("click", close);
  document.getElementById("filters-modal-reset").addEventListener("click", resetDraft);
  document.getElementById("filters-modal-apply").addEventListener("click", apply);

  function refreshHistogram() {
    if (priceWidget) priceWidget.updateUI();
  }

  function setVariant(v) {
    variant = v;
    if (overlay.isOpen()) {
      priceWidget = buildPriceWidget(document.getElementById("f-price-widget"), {
        draft,
        onChange: computeDraftCount,
        priceVariant: variant,
        getAdaptiveBase: computeDraftBase,
      });
      computeDraftCount();
    }
  }

  return { open, close, refreshHistogram, setVariant };
}

  window.App = window.App || {};
  window.App.setupFiltersModal = setupFiltersModal;
})();
