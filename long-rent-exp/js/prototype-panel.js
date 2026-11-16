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
  const current = () => ({ variant: session.variant, gallery: session.gallery, photoui: session.photoUi, deal: state.dealType, type: state.propertyType });
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
      // Новостройки есть только в «Купить»: при смене сделки переключаемся на обычную квартиру
      if (param === "deal" && values.type === "newflat" && chip.dataset.value !== "buy") url.searchParams.set("type", "flat");
      if (url.searchParams.get("gallery") === "1x1") url.searchParams.delete("gallery"); // 1:1 — по умолчанию
      if (url.searchParams.get("photoui") === "dark") url.searchParams.delete("photoui"); // Overlay — по умолчанию
      window.location.href = url.toString();
    });
  });

  // Тип недвижимости зависит от сделки: «Новостройка» — только в «Купить», там же «Квартира» = «Вторичка»
  panel.querySelectorAll('[data-proto-param="type"] .proto-chip').forEach((chip) => {
    if (chip.dataset.deals) chip.hidden = !chip.dataset.deals.split(" ").includes(state.dealType);
    if (chip.dataset.buyLabel) {
      chip.dataset.defaultLabel = chip.dataset.defaultLabel || chip.textContent;
      chip.textContent = state.dealType === "buy" ? chip.dataset.buyLabel : chip.dataset.defaultLabel;
    }
  });

  // Секции, которые влияют только на часть вариантов (data-variants), прячем в остальных
  panel.querySelectorAll("[data-variants]").forEach((section) => {
    section.hidden = !section.dataset.variants.split(" ").includes(session.variant);
  });

  sync();
  document.addEventListener("click", () => setTimeout(sync, 0));
})();
