(function () {
  // ---------- Переключатели в панели «Настройка прототипа» ----------
  // Вариант сниппета, тип сделки и тип недвижимости. Выбор пишем в параметры ссылки
  // и перезагружаем страницу: так ссылку можно скопировать, а логи начинают новую сессию.
  // В ссылках для теста (?task=…) панель не показываем, чтобы респондент не переключал варианты.
  const panel = document.getElementById("prototype-panel");
  if (!panel) return;
  const { state, session } = window.App;
  if (session.task) {
    panel.hidden = true;
    return;
  }

  // Категорию можно сменить и внутри телефона (шторки, фильтры) — поэтому читаем state каждый раз
  const current = () => ({ variant: session.variant, gallery: session.gallery, deal: state.dealType, type: state.propertyType });
  const chips = panel.querySelectorAll("[data-proto-param] .proto-chip");

  function sync() {
    const values = current();
    chips.forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.value === values[chip.parentElement.dataset.protoParam]);
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const param = chip.parentElement.dataset.protoParam;
      const values = current();
      if (chip.dataset.value === values[param]) return;
      const url = new URL(window.location.href);
      url.searchParams.set("deal", values.deal);
      url.searchParams.set("type", values.type);
      url.searchParams.set(param, chip.dataset.value);
      if (url.searchParams.get("gallery") === "4x3") url.searchParams.delete("gallery"); // 4:3 — по умолчанию
      window.location.href = url.toString();
    });
  });

  sync();
  document.addEventListener("click", () => setTimeout(sync, 0));
})();
