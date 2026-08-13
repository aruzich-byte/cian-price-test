(function () {
  const { LISTINGS, state, ui, priceMetric, computeMixSuggestion, renderResults, setupPriceSheet, setupAreaSheet, setupFiltersModal, setupSort, setupMapSheet, initYandexMap, setupPinSheet, pinSheetRef } = window.App;

  document.addEventListener("DOMContentLoaded", () => {
    const priceSheet = setupPriceSheet();
    const areaSheet = setupAreaSheet();
    const filtersModal = setupFiltersModal();
    setupSort();
    setupMapSheet();
    initYandexMap();
    pinSheetRef.current = setupPinSheet();

    document.getElementById("qf-rent").addEventListener("click", () => filtersModal.open(false));
    document.getElementById("qf-office").addEventListener("click", () => filtersModal.open(false));
    document.getElementById("qf-city").addEventListener("click", () => filtersModal.open(false));
    document.getElementById("qf-price").addEventListener("click", () => priceSheet.open());
    document.getElementById("qf-area").addEventListener("click", () => areaSheet.open());
    document.getElementById("filter-icon-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      filtersModal.open(false);
    });
    document.getElementById("search-bar-btn").addEventListener("click", () => filtersModal.open(false));

    // Секция «Гистограмма» (столбики/кривая) имеет смысл только когда для
    // «Фильтр Цена» выбран вариант «Гистограмма», а не «Пресеты».
    const histogramShapeSection = document.getElementById("histogram-shape-section");
    function setHistogramShapeSectionVisible(visible) {
      if (histogramShapeSection) histogramShapeSection.hidden = !visible;
    }

    const variantSwitcher = document.getElementById("price-variant-switcher");
    if (variantSwitcher) {
      variantSwitcher.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-price-variant]");
        if (!btn) return;
        variantSwitcher.querySelectorAll("[data-price-variant]").forEach((b) => b.classList.toggle("is-active", b === btn));
        priceSheet.setVariant(btn.dataset.priceVariant);
        filtersModal.setVariant(btn.dataset.priceVariant);
        setHistogramShapeSectionVisible(btn.dataset.priceVariant === "histogram");
      });
    }

    const mixModeSwitcher = document.getElementById("mix-mode-switcher");
    if (mixModeSwitcher) {
      mixModeSwitcher.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-mix-mode]");
        if (!btn) return;
        mixModeSwitcher.querySelectorAll("[data-mix-mode]").forEach((b) => b.classList.toggle("is-active", b === btn));
        ui.mixMode = btn.dataset.mixMode;
        renderResults();
      });
    }

    const histogramShapeSwitcher = document.getElementById("histogram-shape-switcher");
    if (histogramShapeSwitcher) {
      histogramShapeSwitcher.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-histogram-shape]");
        if (!btn) return;
        histogramShapeSwitcher.querySelectorAll("[data-histogram-shape]").forEach((b) => b.classList.toggle("is-active", b === btn));
        ui.histogramShape = btn.dataset.histogramShape;
        priceSheet.refreshHistogram();
        filtersModal.refreshHistogram();
      });
    }

    const histogramAdaptiveSwitch = document.getElementById("histogram-adaptive-switch");
    if (histogramAdaptiveSwitch) {
      histogramAdaptiveSwitch.addEventListener("click", () => {
        ui.histogramAdaptive = !ui.histogramAdaptive;
        histogramAdaptiveSwitch.classList.toggle("is-on", ui.histogramAdaptive);
        priceSheet.refreshHistogram();
        filtersModal.refreshHistogram();
      });
    }

    const mixThresholdInput = document.getElementById("mix-threshold-input");
    if (mixThresholdInput) {
      mixThresholdInput.value = ui.mixThreshold;
      mixThresholdInput.addEventListener("input", () => {
        const v = Number(mixThresholdInput.value);
        if (Number.isFinite(v)) ui.mixThreshold = v;
        renderResults();
      });
    }

    const mixExpandInput = document.getElementById("mix-expand-input");
    if (mixExpandInput) {
      mixExpandInput.value = ui.mixExpandPercent;
      mixExpandInput.addEventListener("input", () => {
        const v = Number(mixExpandInput.value);
        if (Number.isFinite(v)) ui.mixExpandPercent = v;
        renderResults();
      });
    }

    // Кнопка «Сгенерировать узкую выдачу» (см. панель «Настройка прототипа») —
    // рандомно расставляет площадь/этаж/класс и подбирает диапазон цены так,
    // чтобы строгих результатов оказалось меньше ui.mixThreshold, а «лишние»
    // объекты для подмешивания реально нашлись (проверяем через
    // computeMixSuggestion, а не угадываем — иначе при неудачной ширине окна
    // extrasTotal мог бы оказаться нулевым).
    function randomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function generateNarrowResults() {
      state.dealType = "rent";
      state.propertyType = "commercial";
      state.subtypes = new Set(["office"]);

      const mode = state.priceMode;
      const classesPool = ["A", "B", "C"];

      for (let attempt = 0; attempt < 40; attempt++) {
        const areaOn = Math.random() < 0.5;
        const floorOn = Math.random() < 0.5;
        const classOn = Math.random() < 0.5;

        let areaMin = null,
          areaMax = null,
          floorMin = null,
          floorMax = null,
          classes = new Set();

        if (areaOn) {
          const anchor = LISTINGS[randomInt(0, LISTINGS.length - 1)];
          const spread = anchor.area * (0.3 + Math.random() * 0.7);
          areaMin = Math.max(0, Math.round(anchor.area - spread));
          areaMax = Math.round(anchor.area + spread);
        }
        if (floorOn) {
          const anchor = LISTINGS[randomInt(0, LISTINGS.length - 1)];
          const spread = randomInt(2, 10);
          floorMin = Math.max(0, anchor.floor - spread);
          floorMax = anchor.floor + spread;
        }
        if (classOn) {
          classes = new Set([classesPool[randomInt(0, classesPool.length - 1)]]);
        }

        const base = LISTINGS.filter((item) => {
          if (areaMin != null && item.area < areaMin) return false;
          if (areaMax != null && item.area > areaMax) return false;
          if (floorMin != null && item.floor < floorMin) return false;
          if (floorMax != null && item.floor > floorMax) return false;
          if (classes.size > 0 && !classes.has(item.officeClass)) return false;
          return true;
        });

        // Нужен запас: и на строгую подвыборку (< mixThreshold), и на хотя бы
        // один объект сверху, который попадёт в «лишние».
        if (base.length < ui.mixThreshold + 1) continue;

        const sorted = [...base].sort((a, b) => priceMetric(a, mode) - priceMetric(b, mode));
        const k = randomInt(1, Math.max(1, ui.mixThreshold - 1));
        const startIdx = randomInt(0, sorted.length - k);
        const window_ = sorted.slice(startIdx, startIdx + k);
        const priceMin = priceMetric(window_[0], mode);
        const priceMax = priceMetric(window_[window_.length - 1], mode);

        const result = computeMixSuggestion(base, mode, priceMin, priceMax);
        if (result.strict.length < ui.mixThreshold && result.extrasTotal > 0) {
          state.areaMin = areaMin;
          state.areaMax = areaMax;
          state.floorMin = floorMin;
          state.floorMax = floorMax;
          state.classes = classes;
          state.price[mode] = { min: priceMin, max: priceMax };
          renderResults();
          return;
        }
      }

      // Крайне маловероятный фолбэк: рандомные фильтры за 40 попыток не дали
      // подходящей выборки — берём предельно узкое окно цены по всему датасету
      // (без площади/этажа/класса), там подмешивание сработает почти всегда.
      state.areaMin = null;
      state.areaMax = null;
      state.floorMin = null;
      state.floorMax = null;
      state.classes = new Set();
      const sorted = [...LISTINGS].sort((a, b) => priceMetric(a, mode) - priceMetric(b, mode));
      const k = Math.max(1, ui.mixThreshold - 1);
      const startIdx = randomInt(0, sorted.length - k);
      const window_ = sorted.slice(startIdx, startIdx + k);
      state.price[mode] = { min: priceMetric(window_[0], mode), max: priceMetric(window_[window_.length - 1], mode) };
      renderResults();
    }

    const generateNarrowBtn = document.getElementById("generate-narrow-btn");
    if (generateNarrowBtn) {
      generateNarrowBtn.addEventListener("click", generateNarrowResults);
    }

    // Тройной тап по экрану телефона открывает панель «Настройка прототипа»
    // (на мобильном она по умолчанию скрыта за пределами экрана — см.
    // .prototype-panel в dev-switchers.css). На десктопе панель видна всегда
    // как сайдбар, тап на класс is-open там не влияет.
    const prototypePanel = document.getElementById("prototype-panel");
    const prototypePanelClose = document.getElementById("prototype-panel-close");
    const phoneScreen = document.querySelector(".phone-frame__screen");
    if (prototypePanel && phoneScreen) {
      const TRIPLE_TAP_WINDOW_MS = 600;
      let tapTimestamps = [];
      phoneScreen.addEventListener("click", () => {
        const now = Date.now();
        tapTimestamps = tapTimestamps.filter((t) => now - t < TRIPLE_TAP_WINDOW_MS);
        tapTimestamps.push(now);
        if (tapTimestamps.length >= 3) {
          tapTimestamps = [];
          prototypePanel.classList.add("is-open");
        }
      });
    }
    if (prototypePanelClose && prototypePanel) {
      prototypePanelClose.addEventListener("click", () => prototypePanel.classList.remove("is-open"));
    }

    renderResults();
  });
})();
