(function () {
  const { LISTINGS } = window.App;

  function priceMetric(item, mode) {
    return mode === "perSqm" ? item.pricePerSqmYear : item.price;
  }

  // Обе границы шкалы берём по перцентилям, а не по абсолютным min/max (как у Airbnb):
  // у аренды офиса распределение цены сильно правостороннее, и пара-тройка совсем
  // дешёвых или совсем дорогих выбросов растягивают ось так, что вся основная масса
  // схлопывается в один бар, а по краям — пустота. Значения за пределами
  // [3-го; 97-го] перцентиля просто попадают в крайний бар с своей стороны
  // (ползунок в крайнем положении означает «без ограничения», а не жёсткий
  // порог — см. price-widget.js setMin/setMax).
  const HISTOGRAM_MIN_PERCENTILE = 0.03;
  const HISTOGRAM_MAX_PERCENTILE = 0.97;

  function percentile(sortedArr, p) {
    const idx = Math.min(sortedArr.length - 1, Math.floor(sortedArr.length * p));
    return sortedArr[idx];
  }

  const priceBoundsFromData = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return {
      min: percentile(sorted, HISTOGRAM_MIN_PERCENTILE),
      max: percentile(sorted, HISTOGRAM_MAX_PERCENTILE),
    };
  };

  const PRICE_BOUNDS_RAW = {
    total: priceBoundsFromData(LISTINGS.map((l) => l.price)),
    perSqm: priceBoundsFromData(LISTINGS.map((l) => l.pricePerSqmYear)),
  };

  const PRICE_BOUNDS = {
    total: { min: Math.floor(PRICE_BOUNDS_RAW.total.min / 5000) * 5000, max: Math.ceil(PRICE_BOUNDS_RAW.total.max / 5000) * 5000 },
    perSqm: { min: Math.floor(PRICE_BOUNDS_RAW.perSqm.min / 50) * 50, max: Math.ceil(PRICE_BOUNDS_RAW.perSqm.max / 50) * 50 },
  };

  // Цены на офисы — сильно правосторонне распределены (разброс в тысячи раз между
  // самым дешёвым и самым дорогим лотом), поэтому шкала гистограммы и слайдера — логарифмическая:
  // на линейной шкале дешёвые объявления (их большинство) схлопываются в один бар,
  // и по гистограмме невозможно понять форму распределения. Нижняя граница лог-шкалы
  // берётся из фактического минимума данных (а не из округлённого PRICE_BOUNDS.min,
  // который может округлиться до 0) и подстрахована минимумом в 1, чтобы log10 не ушёл в -Infinity.
  const priceLogFloor = (mode) => Math.max(PRICE_BOUNDS_RAW[mode].min, 1);

  window.App = window.App || {};
  Object.assign(window.App, { priceMetric, PRICE_BOUNDS_RAW, PRICE_BOUNDS, priceLogFloor });
})();
