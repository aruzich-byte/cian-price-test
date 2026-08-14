// Классический скрипт (не ES-модуль) — специально, чтобы прототип открывался
// и напрямую двойным кликом по variant-inline.html (file://), а не только
// через локальный сервер: ES-модули блокируются CORS на file://.
// Все файлы в js/ делят один глобальный неймспейс window.App и подключаются
// обычными <script> тегами в порядке зависимостей (см. variant-inline.html).
(function () {
  const state = {
    dealType: "rent", // 'buy' | 'rent' | 'build'
    propertyType: "commercial", // 'flat' | 'room' | 'house' | 'garage' | 'commercial'
    subtypes: new Set(["office"]),
    priceMode: "total", // 'total' | 'perSqm'
    price: {
      total: { min: null, max: null },
      perSqm: { min: null, max: null },
    },
    areaMin: null,
    areaMax: null,
    floorMin: null,
    floorMax: null,
    classes: new Set(),
    sort: "default",
  };

  // ---------- Dev-переключатели вариантов прототипа (панель «Настройка прототипа») ----------
  // MIX_MODE задаётся в HTML перед подключением модулей:
  //   'inline'         — подмешанные варианты вливаются в общий список без разделителя
  //   'separate'       — подмешанные варианты выносятся отдельным блоком после основного списка
  //   'carousel'       — подмешанные варианты выносятся в горизонтальную карусель
  //   'filter-warning' — в список/карту ничего не подмешивается; вместо этого в фильтре
  //                      цены (полноэкранная модалка «Фильтры» и bottom sheet «Цена»)
  //                      показывается снек «Расширить» с числом дополнительных объектов
  //
  // mixMode/histogramShape живут как поля объекта (не отдельные примитивы),
  // чтобы чтение через App.ui.mixMode всегда видело актуальное значение —
  // простое присваивание примитива в App при подключении через <script> скопировало
  // бы значение один раз и не отражало бы последующие изменения.
  const ui = {
    mixMode: typeof MIX_MODE !== "undefined" ? MIX_MODE : "inline",
    histogramShape: "curve", // 'bars' | 'curve'
    // Если true — гистограмма строится не по всем LISTINGS, а по объектам,
    // которые проходят остальные применённые фильтры (площадь, этаж, класс) —
    // см. getBaseFiltered()/getAdaptiveBase в price-widget.js. Плейсхолдеры
    // цены при этом всегда показывают полный диапазон рынка.
    histogramAdaptive: true,
    // Порог подмешивания и ширина расширения диапазона цены — см.
    // computeMixSuggestion в filtering.js. mixThreshold: если строгих
    // результатов меньше этого числа — подмешиваем соседние по цене.
    // mixExpandPercent: на сколько % расширяется диапазон цены при подмешивании
    // (в него попадают ВСЕ объекты без ограничения по количеству).
    mixThreshold: 6,
    mixExpandPercent: 5,
  };

  window.App = window.App || {};
  Object.assign(window.App, { state, ui });
})();
