(function () {
  // Бренд-импульс быстрых фильтров в «Новом 4» (?variant=new4) — стили в css/brand-chips.css.
  // Импульс играет один раз, когда фильтр применился: чип стал выбранным (is-set)
  // или выбранный чип сменил значение («Снять» → «Купить», «Цена» → «до 60 тыс.»).
  // Сброс фильтра и повторное применение того же значения импульса не дают.
  // Подписи и is-set обновляет render.js; здесь только следим за изменениями,
  // чтобы не трогать логику фильтров.
  if (!window.App || !window.App.session || window.App.session.variant !== "new4") return;

  document.addEventListener("DOMContentLoaded", () => {
    const row = document.querySelector(".quickfilters");
    if (!row) return;
    const chips = Array.from(row.querySelectorAll(".qf-chip"));
    const signature = (chip) => `${chip.classList.contains("is-set")}|${chip.textContent.trim()}`;

    // Фильтр применяется из шторки, а затенение под ней гаснет 0.36s (.overlay-backdrop, css/motion.css) —
    // импульс ждёт, пока чип станет виден целиком
    const AFTER_SHEET_MS = 380; // под пружинное закрытие шторки и затенение 360ms (css/motion.css)

    function pulse(chip) {
      clearTimeout(chip._pulseTimer);
      chip.classList.remove("is-pulsing");
      chip._pulseTimer = setTimeout(() => {
        // Чип мог уехать за край ленты — докручиваем ленту, чтобы импульс было видно
        const left = chip.offsetLeft - 16;
        const right = chip.offsetLeft + chip.offsetWidth + 16 - row.clientWidth;
        if (row.scrollLeft > left) row.scrollTo({ left, behavior: "smooth" });
        else if (row.scrollLeft < right) row.scrollTo({ left: right, behavior: "smooth" });
        chip.classList.add("is-pulsing");
        chip._pulseTimer = setTimeout(() => chip.classList.remove("is-pulsing"), 760);
      }, AFTER_SHEET_MS);
    }

    // Стартовое состояние запоминаем после первой отрисовки, чтобы импульс не играл при загрузке
    const last = new Map();
    requestAnimationFrame(() => {
      chips.forEach((chip) => last.set(chip, signature(chip)));
      new MutationObserver(() => {
        chips.forEach((chip) => {
          const sig = signature(chip);
          if (sig === last.get(chip)) return;
          last.set(chip, sig);
          if (chip.classList.contains("is-set")) pulse(chip);
        });
      }).observe(row, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class"] });
    });
  });
})();
