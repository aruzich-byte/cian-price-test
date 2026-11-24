#!/usr/bin/env python3
"""Собирает js/data-import.js из data-import/offers-*.json и photos-*.json.

Запуск из папки long-rent-exp:  python3 tools/build-data-import.py
data-import.js подключается сразу после data.js и дописывает объявления в RAW_OFFERS/CURATED,
поэтому data.js не меняется (меньше конфликтов с другими ветками).
"""
import json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
cats = ["rent-flat", "buy-flat", "buy-newflat", "buy-house", "rent-house", "daily-flat", "daily-house"]
offers, curated = [], {}
for cat in cats:
    o = json.loads((root / f"data-import/offers-{cat}.json").read_text())
    p = json.loads((root / f"data-import/photos-{cat}.json").read_text())
    for i, item in enumerate(o):
        offers.append(item)
        # Новые объявления идут в выдаче после отобранных вручную (order 1…7)
        curated[item["id"]] = {"order": 100 + i, "hasLayout": False, "category": cat, "photos": p[item["id"]]}

dump = lambda x: json.dumps(x, ensure_ascii=False, separators=(",", ":"))
out = f"""(function () {{
  // СГЕНЕРИРОВАНО tools/build-data-import.py из data-import/*.json — руками не править.
  // +13 объявлений в каждой категории, собраны с spb.cian.ru 24.11.2026 (подробности — data-import/README.md).
  // Дописываются в конец выдачи каждой категории, после объявлений из data.js.
  const {{ RAW_OFFERS, CURATED, buildListings }} = window.App;
  const OFFERS = [
{",\n".join("    " + dump(x) for x in offers)}
  ];
  const PHOTOS = {dump(curated)};
  RAW_OFFERS.push(...OFFERS);
  Object.assign(CURATED, PHOTOS);
  window.App.LISTINGS = buildListings(RAW_OFFERS);
}})();
"""
(root / "js/data-import.js").write_text(out)
print(len(offers), "offers")
