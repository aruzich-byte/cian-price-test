/**
 * Датасет прототипа — 4 реальные квартиры в долгосрочную аренду (Санкт-Петербург)
 * с spb.cian.ru, с нашими фото (photos/1…4). Изначально собирали 1324 объявления
 * через API поисковой выдачи (07.10.2026), остальные пока убраны.
 * Все поля — как на сайте: комнатность, площадь, этаж, цена, залог, комиссия
 * (clientFee, % от месячной цены), ЖК, адрес, ближайшее метро, координаты,
 * продавец, «Суперагент», есть ли у него фото, «Проверено в Росреестре», «Ранний доступ».
 * isGoodPrice — посчитано по тем 1324 объявлениям: цена ≤ 85% медианы среди
 * квартир той же комнатности (сейчас сравнивать не с чем, поэтому зафиксировано).
 */

(function () {
  // Реальные объявления: flatType 'rooms' | 'studio' | 'openPlan'; rooms — null у студий;
  // metroTransport 'walk' | 'transport' (минуты пешком или на транспорте);
  // metroColor — цвет линии метро (hex без #); agency — null, если имя продавца скрыто
  const RAW_OFFERS = [
  {"id":"317754009","flatType":"studio","rooms":null,"isApartments":true,"area":29.0,"floor":14,"floorsTotal":23,"price":48000,"deposit":40000,"clientFee":0,"jk":null,"street":"проспект Просвещения","house":"83","metro":"Гражданский проспект","metroMin":10,"metroTransport":"walk","metroColor":"D70834","lat":60.036793,"lon":30.407317,"agency":"SVET hotel","isByHomeowner":false,"isSuperAgent":false,"addedDaysAgo":0,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":true,"isGoodPrice":false},
  {"id":"334543276","flatType":"rooms","rooms":1,"isApartments":false,"area":30.7,"floor":3,"floorsTotal":5,"price":26000,"deposit":15000,"clientFee":100,"jk":null,"street":"улица Карпинского","house":"24","metro":"Академическая","metroMin":5,"metroTransport":"transport","metroColor":"D70834","lat":60.008968,"lon":30.423244,"agency":"Иван Тарасов","isByHomeowner":false,"isSuperAgent":true,"addedDaysAgo":0,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":false,"isGoodPrice":true},
  {"id":"229135673","flatType":"rooms","rooms":2,"isApartments":false,"area":45.0,"floor":5,"floorsTotal":5,"price":64000,"deposit":60000,"clientFee":0,"jk":null,"street":"3-я Советская улица","house":"10","metro":"Площадь Восстания","metroMin":8,"metroTransport":"walk","metroColor":"D70834","lat":59.933609,"lon":30.367369,"agency":"BRIDGE APARTS","isByHomeowner":false,"isSuperAgent":false,"addedDaysAgo":0,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":true,"isGoodPrice":false},
  {"id":"324112325","flatType":"studio","rooms":null,"isApartments":true,"area":22.4,"floor":10,"floorsTotal":12,"price":35000,"deposit":35000,"clientFee":0,"jk":"ЖК «Апарт-отель Kirovsky AVENIR»","street":"дорога На Турухтанные острова","house":"5к1","metro":"Автово","metroMin":10,"metroTransport":"walk","metroColor":"D70834","lat":59.870041,"lon":30.253552,"agency":"Магнит","isByHomeowner":false,"isSuperAgent":true,"addedDaysAgo":0,"isRosreestrChecked":false,"isEarlyAccess":false,"hasAvatar":true,"isGoodPrice":false}
];

  // ---------- Фото, подписи и условия проживания (photos/1…4) ----------
  // order — порядок в выдаче. Порядок фото: интерьер → планировка (если есть)
  // → кухня → санузлы → комнаты (балкон, коридор) → дом. caption — подпись на фото со 2-го:
  // только факты с Циана (характеристики, описание, планировка). kidsAllowed/petsAllowed — из
  // «Условий проживания» на странице объявления; промо-лейбл таким не придумываем.
  const CURATED = {
    "317754009": {
      order: 1,
      hasLayout: false,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544456-1.webp", caption: null },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544454-1.webp", caption: "Кухонная зона · варочная панель" },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544466-1.webp", caption: "Кухонная зона · обеденный стол" },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544498-1.webp", caption: "Совмещённый санузел · душ" },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544394-1.webp", caption: "Спальная зона · дизайнерский ремонт" },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544497-1.webp", caption: "Студия · окна на улицу и двор" },
        { src: "photos/1/kvartira-sanktpeterburg-prospekt-prosveshceniya-2495544477-1.webp", caption: "Рабочая зона" },
      ],
    },
    "334543276": {
      order: 2,
      hasLayout: true,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088668-1.webp", caption: null },
        { src: "photos/2/Снимок экрана 2026-10-07 в 15.38.51.png", caption: "Потолки 2,5 м" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088663-1.webp", caption: "Кухня · 6,5 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088675-1.webp", caption: "Кухня · газовая плита" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978085350-1.webp", caption: "Кухня · обеденная зона" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088661-1.webp", caption: "Кухня" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088664-1.webp", caption: "Совмещённый санузел · ванна" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088666-1.webp", caption: "Совмещённый санузел" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088660-1.webp", caption: "Санузел · стиральная машина" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088669-1.webp", caption: "Комната · 17,4 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088679-1.webp", caption: "Комната · евроремонт" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088670-1.webp", caption: "Комната · шкаф-купе" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088684-1.webp", caption: "Балкон · застеклён" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088681-1.webp", caption: "Вид с балкона" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088665-1.webp", caption: "Балкон" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088674-1.webp", caption: "Коридор · 4,1 м²" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088671-1.webp", caption: "Коридор" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088658-1.webp", caption: "Прихожая" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088659-1.webp", caption: "Прихожая" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088680-1.webp", caption: "Встроенный шкаф" },
        { src: "photos/2/kvartira-sanktpeterburg-ulica-karpinskogo-2978088682-1.webp", caption: "Дом · построен в 1965 г" },
      ],
    },
    "229135673": {
      order: 3,
      hasLayout: false,
      kidsAllowed: true,
      petsAllowed: true,
      photos: [
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639451-1.webp", caption: null },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658332-1.webp", caption: "Кухня · 10 м²" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639593-1.webp", caption: "Кухня · холодильник" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658304-1.webp", caption: "Кухня · обеденная зона" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639543-1.webp", caption: "Кухня · стол у окна" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658333-1.webp", caption: "Кухня · варочная панель" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639637-1.webp", caption: "Кухня" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639653-1.webp", caption: "Совмещённый санузел · ванна" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639662-1.webp", caption: "Санузел · душ" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639699-1.webp", caption: "Санузел · стиральная машина" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639708-1.webp", caption: "Санузел" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658356-1.webp", caption: "Санузел" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639682-1.webp", caption: "Санузел" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658335-1.webp", caption: "Гостиная · двуспальный диван" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592653663-1.webp", caption: "Гостиная" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658339-1.webp", caption: "Гостиная" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639492-1.webp", caption: "Гостиная" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658331-1.webp", caption: "Гостиная · телевизор" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658334-1.webp", caption: "Гостиная" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639501-1.webp", caption: "Спальня · кровать 180×200" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639521-1.webp", caption: "Спальня" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639535-1.webp", caption: "Спальня · шкаф для одежды" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639508-1.webp", caption: "Спальня" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658320-1.webp", caption: "Коридор" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592837166-1.webp", caption: "Коридор" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592658340-1.webp", caption: "Прихожая" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639764-1.webp", caption: "Прихожая" },
        { src: "photos/3/kvartira-sanktpeterburg-3ya-sovetskaya-ulica-2592639789-1.webp", caption: "Дом · построен в 1914 г" },
      ],
    },
    "324112325": {
      order: 4,
      hasLayout: true,
      kidsAllowed: false,
      petsAllowed: false,
      photos: [
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480468-1.webp", caption: null },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706436162-1.webp", caption: "Студия · 22,4 м²" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480433-1.webp", caption: "Кухонная зона · варочная панель" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480475-1.webp", caption: "Кухонная зона" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480441-1.webp", caption: "Кухонная зона · холодильник" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480439-1.webp", caption: "Кухонная зона · барная стойка" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706434294-1.webp", caption: "Совмещённый санузел · душ" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480446-1.webp", caption: "Санузел · стиральная машина" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480440-1.webp", caption: "Санузел · душевая" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480443-1.webp", caption: "Жилая зона · 14,7 м²" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480442-1.webp", caption: "Жилая зона · кровать 180×200" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480444-1.webp", caption: "Жилая зона · ТВ" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706433911-1.webp", caption: "Жилая зона" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706434067-1.webp", caption: "Прихожая · шкафы" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480445-1.webp", caption: "Прихожая" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706434141-1.webp", caption: "Прихожая" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706434609-1.webp", caption: "Апарт-комплекс · ресепшн" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480474-1.webp", caption: "Лобби" },
        { src: "photos/4/kvartira-sanktpeterburg-doroga-na-turuhtannye-ostrova-2706480438-1.webp", caption: "Лифтовой холл" },
      ],
    },
  };

  // ---------- Лейблы под фото ----------
  // Только реальные факты: флаги Циана, isGoodPrice и «Условия проживания» из CURATED.
  function buildLabels(raw) {
    const labels = [];
    const curated = CURATED[raw.id];
    if (raw.isEarlyAccess) labels.push("Ранний доступ");
    if (raw.isGoodPrice) labels.push("Хорошая цена");
    if (curated && curated.kidsAllowed) labels.push("Можно с детьми");
    if (curated && curated.petsAllowed) labels.push("Можно с животными");
    if (raw.isRosreestrChecked) labels.push("Проверено в Росреестре");
    return labels;
  }

  // Детерминированное «случайное» число 0…1 от строки — для выбора аватарки
  function hashId(id, salt) {
    let h = 2166136261;
    for (const ch of id + salt) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return (h >>> 0) / 4294967296;
  }

  // ---------- Аватарки продавцов (photos/avatars) ----------
  // Агентство «Этажи» — его логотип, остальные агентства — логотип «Лабецкий Недвижимость».
  // Люди, у которых на Циане есть фото (hasAvatar), — одно из фото риелторов того же пола
  // (пол по имени), без фото и скрытые продавцы — заглушка. Выбор — от имени продавца,
  // чтобы у одного продавца везде была одна и та же аватарка.
  const AVATAR_DIR = "photos/avatars/";
  const AGENCY_LOGO_ETAZHI = "Снимок экрана 2026-10-07 в 21.23.26.png";
  const AGENCY_LOGO_DEFAULT = "Снимок экрана 2026-10-07 в 21.23.55.png";
  const REALTOR_PHOTOS = {
    female: ["Риелтор 1 · Анна.png", "Риелтор 3 · Мария.png", "Риелтор 5 · Дарья.png"],
    male: ["Риелтор 2 · Максим.png", "Риелтор 4 · Артём.png"],
  };
  const AVATAR_STUBS = [
    "Аватар 1 · Треугольник · Улыбка.png",
    "Аватар 2 · Квадрат · Смех.png",
    "Аватар 3 · Квадрат · Наклон и улыбка.png",
    "Аватар 4 · Треугольник · Подмигивание.png",
    "Аватар 5 · Квадрат · Радость.png",
    "Аватар 6 · Треугольник · Счастье.png",
    "Аватар 7 · Квадрат · Хитрая улыбка.png",
  ];
  const AGENCY_WORDS = /недвиж|агентств|бюро|риэлт|риелт|апарт|отель|сеть|групп|инвест|estate|realty/i;
  const MALE_NAMES_ON_A = ["никита", "илья", "кузьма", "фома", "лука", "савва", "данила"];

  function normalizeName(name) {
    return name.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  }

  // Человек: 2–4 слова кириллицей, все с заглавной или все строчные (бывает «анна пирогова»),
  // допускаются «ИП» и инициалы. Всё остальное («Сенатор», «SVET hotel», «Морской фасад») — агентство.
  function isPersonName(name) {
    const clean = normalizeName(name).replace(/^ИП /, "");
    // Латиница, цифры, кавычки и прочие символы — признак названия компании
    if (AGENCY_WORDS.test(clean) || /[^А-ЯЁа-яё.\- ]/.test(clean)) return false;
    const words = clean.split(" ");
    if (words.length < 2 || words.length > 4) return false;
    // «Анна», «Крейсс-Белова», инициалы «О.А.» / «О.»
    const capitalized = words.every((w) => /^([А-ЯЁ][а-яё]+(-[А-ЯЁа-яё][а-яё]+)*|[А-ЯЁ]\.([А-ЯЁ]\.?)?)$/.test(w));
    const lower = words.every((w) => /^[а-яё-]+$/.test(w));
    return capitalized || lower;
  }

  function isFemaleName(name) {
    const first = normalizeName(name).replace(/^ИП /, "").split(" ")[0].toLowerCase();
    return /[ая]$/.test(first) && !MALE_NAMES_ON_A.includes(first);
  }

  function pickBy(list, key) {
    return list[Math.floor(hashId(key, "avatar") * list.length)];
  }

  function buildAvatar(raw) {
    const name = raw.agency;
    if (name && !isPersonName(name)) {
      return AVATAR_DIR + (/этажи/i.test(name) ? AGENCY_LOGO_ETAZHI : AGENCY_LOGO_DEFAULT);
    }
    const key = name || raw.id;
    if (name && raw.hasAvatar) {
      return AVATAR_DIR + pickBy(REALTOR_PHOTOS[isFemaleName(name) ? "female" : "male"], key);
    }
    return AVATAR_DIR + pickBy(AVATAR_STUBS, key);
  }

  // Роль продавца для строки контактов: агентство / собственник / агент
  function sellerRole(raw) {
    if (raw.agency && !isPersonName(raw.agency)) return "Агентство недвижимости";
    return raw.isByHomeowner ? "Собственник" : "Агент";
  }

  function buildListings(rawOffers) {
    const sorted = [...rawOffers].sort((x, y) => CURATED[x.id].order - CURATED[y.id].order);
    return sorted.map((raw) => ({
      ...raw,
      photos: CURATED[raw.id].photos, // [{ src, caption }]
      hasLayout: CURATED[raw.id].hasLayout,
      address: [raw.street, raw.house].filter(Boolean).join(", "),
      avatar: buildAvatar(raw),
      sellerRole: sellerRole(raw),
      labels: buildLabels(raw),
      // Поля, на которых пока держатся старые офисные фильтры (цена за м², класс) —
      // уберём, когда переделаем фильтры под квартиры
      pricePerSqmYear: Math.max(100, Math.round((raw.price * 12) / raw.area / 100) * 100),
      officeClass: null,
    }));
  }

  const LISTINGS = buildListings(RAW_OFFERS);

  window.App = window.App || {};
  Object.assign(window.App, { RAW_OFFERS, CURATED, buildListings, LISTINGS });
})();
