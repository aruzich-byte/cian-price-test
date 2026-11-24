(function () {
  // ---------- Анимации в стиле iOS для «Нового 4» (стили и кривые — css/motion.css) ----------
  // 2) сниппеты всплывают при прокрутке, первые — лесенкой; 3) шторки смахиваются вниз пальцем
  // или мышью; 4) счётчик «2/12» перелистывается вверх/вниз. Остальное — чистый CSS.
  if (!document.documentElement.classList.contains("variant-new4")) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.App = window.App || {};
  window.App.motion = { reduce };
  if (reduce) return;

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;
    const list = document.getElementById("results-list");
    const scroller = document.getElementById("results-scroll");

    // ---------- 2. Появление сниппетов ----------
    if (list && "IntersectionObserver" in window) {
      root.classList.add("motion-ready");
      let batch = 0; // сколько карточек показали в этом кадре — для лесенки
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.style.setProperty("--in-delay", `${Math.min(batch, 4) * 40}ms`);
            batch += 1;
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          });
          requestAnimationFrame(() => (batch = 0));
        },
        { root: scroller || null, threshold: 0.08 }
      );
      const watch = (node) => {
        if (node.nodeType === 1 && node.classList.contains("card--n4")) {
          io.observe(node);
          watchCounter(node);
        }
      };
      new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(watch))).observe(list, { childList: true });
      list.querySelectorAll(".card--n4").forEach(watch);
    }

    // ---------- 4. Счётчик слайдов перелистывается ----------
    function watchCounter(card) {
      const counter = card.querySelector('[data-role="counter"]');
      if (!counter) return;
      let prev = parseInt(counter.textContent, 10) || 1;
      new MutationObserver(() => {
        const now = parseInt(counter.textContent, 10) || 1;
        if (now === prev) return;
        const cls = now > prev ? "is-tick-next" : "is-tick-prev";
        prev = now;
        counter.classList.remove("is-tick-next", "is-tick-prev");
        void counter.offsetWidth;
        counter.classList.add(cls);
      }).observe(counter, { childList: true, characterData: true, subtree: true });
    }

    // ---------- 3. Шторки смахиваются вниз ----------
    // Тянем за верх шторки (крестик/заголовок, первые 72px): идёт за пальцем, отпустили ниже
    // 90px или быстрым броском — закрываем тем же крестиком, иначе пружиной на место.
    document.querySelectorAll(".sheet").forEach((sheet) => {
      const close = sheet.querySelector(".sheet__close");
      if (!close) return;
      let drag = null;
      sheet.addEventListener("pointerdown", (e) => {
        if (!sheet.classList.contains("is-open")) return;
        const top = sheet.getBoundingClientRect().top;
        if (e.clientY - top > 72 || e.target.closest("button:not(.sheet__close), input")) return;
        drag = { y: e.clientY, dy: 0, t: e.timeStamp, v: 0, id: e.pointerId, moved: false };
      });
      sheet.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const dy = Math.max(0, e.clientY - drag.y);
        const dt = e.timeStamp - drag.t;
        if (dt > 0) drag.v = (dy - drag.dy) / dt;
        drag.dy = dy;
        drag.t = e.timeStamp;
        if (!drag.moved && dy > 4) {
          drag.moved = true;
          sheet.setPointerCapture(drag.id);
          sheet.classList.add("is-dragging");
        }
        if (drag.moved) sheet.style.transform = `translateY(${dy}px)`;
      });
      const finish = () => {
        if (!drag) return;
        const { dy, v, moved } = drag;
        drag = null;
        sheet.classList.remove("is-dragging");
        sheet.style.transform = "";
        if (moved && (dy > 90 || v > 0.6)) close.click();
      };
      sheet.addEventListener("pointerup", finish);
      sheet.addEventListener("pointercancel", finish);
    });
  });
})();
