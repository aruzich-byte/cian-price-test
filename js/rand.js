(function () {
  // Детерминированный PRNG — чтобы сгенерированные (недостающие в исходных данных)
  // поля были стабильны между перезагрузками страницы.
  const SEED = 20260811;

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(SEED);

  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  function pickWeighted(weights) {
    const r = rand();
    let acc = 0;
    for (const [value, w] of weights) {
      acc += w;
      if (r < acc) return value;
    }
    return weights[weights.length - 1][0];
  }

  window.App = window.App || {};
  Object.assign(window.App, { mulberry32, rand, pick, pickWeighted });
})();
