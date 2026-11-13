(function () {
  const { createOverlayController, formatPrice } = window.App;

  // ---------- Заглушка карточки объявления ----------
  // Карточки в прототипе нет; для UX-теста важно лишь зафиксировать, что сниппет открыли
  // (это делает cards.js → track «Открыл карточку»), и вернуть респондента к выдаче.
  const overlay = createOverlayController(document.getElementById("card-stub-backdrop"), document.getElementById("card-stub"));
  const listingEl = document.getElementById("card-stub-listing");

  const titleEl = document.querySelector("#card-stub .sheet__title");
  const textEl = document.querySelector("#card-stub .card-stub__text");
  const CARD_TITLE = titleEl.textContent;
  const CARD_TEXT = textEl.textContent;

  function openCardStub(item) {
    titleEl.textContent = CARD_TITLE;
    textEl.textContent = CARD_TEXT;
    listingEl.textContent = `${formatPrice(item.price)}${item.dealType === "rent" ? "/мес." : ""} · ${item.address || ""}`;
    overlay.open();
  }

  ["card-stub-close", "card-stub-back", "card-stub-backdrop"].forEach((id) => document.getElementById(id).addEventListener("click", overlay.close));

  window.App = window.App || {};
  window.App.openCardStub = openCardStub;
  // Та же шторка как заглушка для функций, которых в прототипе нет («Поделиться» на десктопе, меню «…»)
  window.App.openInfoStub = ({ title, text }) => {
    titleEl.textContent = title;
    textEl.textContent = text;
    listingEl.textContent = "";
    overlay.open();
  };
})();
