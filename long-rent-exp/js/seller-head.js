(function () {
  // Вид шапки продавца в «Новом 4» (стили — css/card-new4.css, [data-seller-head]).
  // strip (по умолчанию) — серая полоса на всю ширину вплотную к фото; bubble — облачко-сообщение на белом.
  // Берётся из ?sellerhead=…, переключается в панели «Настройка прототипа» без перезагрузки.
  const PRESETS = ["bubble", "strip"];
  const url = new URL(window.location.href);
  let preset = PRESETS.includes(url.searchParams.get("sellerhead")) ? url.searchParams.get("sellerhead") : "strip";
  const apply = () => document.documentElement.setAttribute("data-seller-head", preset);
  apply();

  document.addEventListener("DOMContentLoaded", () => {
    const chips = document.querySelectorAll("[data-seller-head-chips] .proto-chip");
    const sync = () => chips.forEach((c) => c.classList.toggle("is-active", c.dataset.value === preset));
    chips.forEach((chip) =>
      chip.addEventListener("click", () => {
        preset = chip.dataset.value;
        apply();
        sync();
        const u = new URL(window.location.href);
        if (preset === "strip") u.searchParams.delete("sellerhead");
        else u.searchParams.set("sellerhead", preset);
        history.replaceState(null, "", u);
      })
    );
    sync();
  });
})();
