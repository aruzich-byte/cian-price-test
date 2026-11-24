(function () {
  // Пресет подсветки комнаты на планировке (стили — css/plan-highlight.css).
  // Берётся из ?roomhl=…, переключается в панели «Настройка прототипа» без перезагрузки.
  const PRESETS = ["blue", "aberration", "orange", "outline"];
  const url = new URL(window.location.href);
  let preset = PRESETS.includes(url.searchParams.get("roomhl")) ? url.searchParams.get("roomhl") : "aberration";
  const apply = () => document.documentElement.setAttribute("data-room-hl", preset);
  apply();

  document.addEventListener("DOMContentLoaded", () => {
    const chips = document.querySelectorAll("[data-room-hl-chips] .proto-chip");
    const sync = () => chips.forEach((c) => c.classList.toggle("is-active", c.dataset.value === preset));
    chips.forEach((chip) =>
      chip.addEventListener("click", () => {
        preset = chip.dataset.value;
        apply();
        sync();
        const u = new URL(window.location.href);
        u.searchParams.set("roomhl", preset);
        history.replaceState(null, "", u);
      })
    );
    sync();
  });
})();
