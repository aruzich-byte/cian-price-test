(function () {
  const { priceMetric, formatPriceShort, formatInt, state, pinSheetRef } = window.App;

  // ---------- Карта: пины с ценой, кластеризуются на дальних зумах ----------
  let yandexMap = null;
  let clusterer = null;
  let pendingPinItems = null;
  let pinLayoutClass = null;
  let clusterIconLayout = null;

  // Центр Санкт-Петербурга — Дворцовая площадь
  const MAP_CENTER = [59.9386, 30.3141];

  function initYandexMap() {
    if (typeof ymaps === "undefined") return;
    ymaps.ready(() => {
      yandexMap = new ymaps.Map(
        "yandex-map",
        {
          center: MAP_CENTER,
          zoom: 12,
          controls: [],
        },
        { suppressMapOpenBlock: true }
      );
      pinLayoutClass = ymaps.templateLayoutFactory.createClass(
        '<div class="map-pin"><span class="map-pin__bubble">$[properties.label]</span></div>'
      );
      clusterIconLayout = ymaps.templateLayoutFactory.createClass(
        '<div class="map-cluster"><span class="map-cluster__count"></span></div>',
        {
          build: function () {
            clusterIconLayout.superclass.build.call(this);
            const count = this.getData().properties.get("geoObjects").length;
            this.getElement().querySelector(".map-cluster__count").textContent = formatInt(count);
          },
        }
      );
      // Группируем пины по сетке — на дальних зумах вместо сотен отдельных
      // меток рисуется один кластер-кружок, клик по нему приближает карту.
      // На близких зумах (>= 17, отдельные здания/кварталы) кластеризация
      // выключается — там показываем каждый пин отдельно.
      clusterer = new ymaps.Clusterer({
        clusterIconLayout,
        clusterIconShape: { type: "Circle", coordinates: [0, 0], radius: 26 },
        maxZoom: 16,
      });
      yandexMap.geoObjects.add(clusterer);
      if (pendingPinItems) {
        renderMapPins(pendingPinItems);
        pendingPinItems = null;
      }
    });
  }

  function renderMapPins(items) {
    if (!yandexMap || !clusterer) {
      pendingPinItems = items;
      return;
    }
    clusterer.removeAll();
    const placemarks = items.map((item) => {
      const placemark = new ymaps.Placemark(
        [item.lat, item.lon],
        { label: formatPriceShort(priceMetric(item, state.priceMode)) },
        {
          iconLayout: pinLayoutClass,
          iconShape: { type: "Rectangle", coordinates: [[-46, -18], [46, 18]] },
        }
      );
      placemark.events.add("click", () => {
        if (pinSheetRef.current) pinSheetRef.current.open(item);
      });
      return placemark;
    });
    clusterer.add(placemarks);
  }

  window.App = window.App || {};
  Object.assign(window.App, { initYandexMap, renderMapPins });
})();
