/* ═══ tutorial-i18n.js — Language packs for the onAudience Tutorial ═══
   6 languages: EN · PL · ES · UK · ISV · TL
   FM military style maintained in all languages.
   Cultural jokes are language-specific — not translated from English.
   ════════════════════════════════════════════════════════════════════ */

export const LANG_META = {
  en:  { flag:'🇬🇧', label:'EN',  name:'English'            },
  pl:  { flag:'🇵🇱', label:'PL',  name:'Polski'             },
  es:  { flag:'🇪🇸', label:'ES',  name:'Español'            },
  uk:  { flag:'🇺🇦', label:'UA',  name:'Українська'         },
  isv: { flag:'🌐',  label:'ISV', name:'Medžuslovjansky'    },
  tl:  { flag:'🇵🇭', label:'TL',  name:'Filipino'           },
};

export const STEP_I18N = {

  /* ══════════════════════════════════════════════════════════════════
     🇵🇱  POLSKI — Styl FM. Czarny humor. Relacje ponad algorytmy.
     ══════════════════════════════════════════════════════════════════ */
  pl: {
    welcome: {
      title:'★  ODPRAWA OPERACYJNA  ★',
      sub:'Wdrożenie Operatora — Sekwencja Zainicjowana',
      body:'Witamy w <b>Centrum Wywiadu Sprzedażowego</b>.\n\nZa chwilę staniesz się niebezpieczną osobą na każdym spotkaniu B2B. Szkolenie trwa 5 minut. Resztę znajdziesz w podręczniku — <b>FM-OA-2026</b>.\n\n<i>Uwaga: W Polsce kontakty są ważniejsze niż dane. Tu masz oba.</i>',
      btn:'ROZPOCZNIJ SZKOLENIE  ▶',
      achievement:{name:'ZACIĄGNIĘTY',desc:'Dołączył do korpusu operatorów'},
    },
    company_list: {
      title:'📋  LISTA FIRM',
      sub:'SEKCJA 2  //  FM-OA-2026',
      body:'<b>2 062 firmy</b>. Posortowane według wyniku ICP — najlepsza szansa na górze.\n\nKliknij dowolny wiersz, aby otworzyć teczkę firmy. To Twój cały wszechświat targetów. Przewijaj. Filtruj. Opanuj.\n\n<i>Tyle firm, a wciąż nie wiadomo, z którą zacząć. Typowe.</i>',
      btn:'ZROZUMIAŁEM  →',
      hint:'WSKAZÓWKA: Kliknij prawym przyciskiem wiersz — 8 szybkich akcji',
    },
    stats_bar: {
      title:'📊  FILTRY PIPELINE\'U',
      sub:'SEKCJA 2.1  //  FM-OA-2026',
      body:'Pasek statystyk pokazuje podział pipeline\'u:\n<b>Klienci · POC · Partnerzy · Prospekty · Brak kontaktu · Świeże</b>\n\nKliknij <b>PROSPEKTY</b>, aby skupić się na celach, które jeszcze nie zostały pozyskane.\n\n<i>„Prospekt" po polsku brzmi jak coś chemicznego. Tu chodzi o pieniądze.</i>',
      btn:'POJĄŁEM  →',
    },
    company_panel: {
      title:'🏢  TECZKA FIRMY',
      sub:'SEKCJA 3  //  FM-OA-2026',
      body:'Kliknij dowolną firmę, aby otworzyć pełny profil. <b>Jedenaście sekcji</b> ładuje się z bazy w czasie rzeczywistym:\n\nKontakty · Wiadomości · Kąt Dotarcia · Historia Maili · Lemlist · Produkty · Mapper · Relacje\n\nWszystko. Jeden klik.',
      btn:'DALEJ  →',
      achievement:{name:'OCZY OTWARTE',desc:'Otworzył teczkę firmy'},
    },
    outreach_angle: {
      title:'💡  KĄT DOTARCIA  +  PERSONY',
      sub:'SEKCJA 5  //  FM-OA-2026',
      body:'Otwórz firmę → rozwiń <b>💡 Kąt Dotarcia</b> → kliknij <b>↺ Regeneruj</b>.\n\nPojawiają się <b>10 przycisków persony</b>. Każda pisze zupełnie innym głosem:\n🍎 Steve — minimalizm · ⚡ Jeff — liczby · 📦 Gary — bez owijania w bawełnę\n🌊 Maya — narracja · 🏛 Winston — patos\n\n<i>Gary to ten gość z Torunia, który mówi wprost co myśli. Używaj z rozwagą.</i>',
      btn:'DOSKONALE  →',
      achievement:{name:'SŁOWOTWÓRCA',desc:'Odkrył system person'},
    },
    ai_bar: {
      title:'🤖  PASEK ZAPYTAŃ AI',
      sub:'SEKCJA 5.1  //  FM-OA-2026',
      body:'Pasek AI na dole lewego panelu filtruje listę firm za pomocą języka naturalnego.\n\nWpisz <b>„high ICP no outreach"</b> lub kliknij chip <b>No angle</b>. Lista natychmiast pokazuje tylko firmy o wysokim potencjale bez napisanego kąta.\n\n<i>Poniedziałkowy poranek. Kawa jeszcze nie działa. AI już tak.</i>',
      btn:'ODBIERAM  →',
      hint:'WSKAZÓWKA: Chipy szybkiego dostępu obsługują najczęstsze zapytania',
    },
    compose: {
      title:'✉  KOMPOZYTOR MEESEEKS',
      sub:'SEKCJA 5.2  //  FM-OA-2026',
      body:'Kliknij <b>✉ Compose</b> w nawigacji (prawy górny róg). Otwiera się Kompozytor Meeseeks.\n\nWybierz firmę → wybierz kontakt → wybierz personę → kliknij <b>✉ Wygeneruj Email</b>.\n\nTemat + pełna treść maila w ~3 sekundy. Popraw jedno zdanie. Wyślij. Bierz chwałę.',
      btn:'MISJA ZALICZONA  →',
      achievement:{name:'PIERWSZY KONTAKT',desc:'Odkrył Kompozytora Meeseeks'},
    },
    gmail: {
      title:'📧  POŁĄCZ GMAIL',
      sub:'SEKCJA 4.1  //  FM-OA-2026',
      body:'Hub może przeskanować Twoją skrzynkę Gmail:\n• Znajdź istniejące wątki z dowolną firmą\n• Wyodrębnij imiona i emaile kontaktów\n• Pokaż historię relacji\n\nOperatorzy z połączonym Gmailem widzą <b>3× więcej danych kontaktowych</b>. Zajmuje 10 sekund.\n\n<i>W Polsce i tak wszystko załatwia się przez telefon. Ale emaile też się przydają.</i>',
      btn:'⚡ POŁĄCZ GMAIL',
      btnAlt:'POMIŃ NA RAZIE',
      achievement:{name:'RAJDER SKRZYNKI',desc:'Połączył Gmail dla wywiadu relacyjnego'},
    },
    complete: {
      title:'🏆  OPERATOR CERTYFIKOWANY',
      sub:'SZKOLENIE UKOŃCZONE  //  WSZYSTKIE CELE ZREALIZOWANE',
      body:'Masz teraz zezwolenie na samodzielne operacje.\n\n<b>Podręcznik Polowy FM-OA-2026</b> opisuje każdą funkcję szczegółowo — sprawdź folder pobrań.\n\nIdź i znajdź partnerów danych.\n\n<i>Powodzenia. Jakoś to będzie — ale tu wiemy, że będzie dobrze.</i>',
      btn:'POWRÓT DO CENTRUM  ⇒',
    },
  },

  /* ══════════════════════════════════════════════════════════════════
     🇪🇸  ESPAÑOL — Manual FM con pasión mediterránea.
     ══════════════════════════════════════════════════════════════════ */
  es: {
    welcome: {
      title:'★  INFORME DE INTELIGENCIA  ★',
      sub:'Incorporación del Operador — Secuencia Iniciada',
      body:'Bienvenido al <b>Centro de Inteligencia de Ventas</b>.\n\n¡Estás a punto de convertirte en una persona muy peligrosa en cualquier reunión B2B! Esta instrucción dura 5 minutos. El resto está en el manual — <b>FM-OA-2026</b>.\n\n<i>Nota del mando: No lo dejes para mañana. Lo decimos en serio esta vez.</i>',
      btn:'COMENZAR INSTRUCCIÓN  ▶',
      achievement:{name:'RECLUTADO',desc:'Se incorporó al cuerpo de operadores'},
    },
    company_list: {
      title:'📋  LA LISTA DE EMPRESAS',
      sub:'SECCIÓN 2  //  FM-OA-2026',
      body:'<b>2.062 empresas</b>. Ordenadas por puntuación ICP — la mejor oportunidad primero.\n\nHaz clic en cualquier fila para abrir el dossier. Esta lista es todo tu universo de objetivos.\n\n<i>¡Madre mía, cuántas empresas! Tranquilo — el AI sabe cuáles importan.</i>',
      btn:'ENTENDIDO  →',
      hint:'CONSEJO: Clic derecho en cualquier fila — 8 acciones rápidas',
    },
    stats_bar: {
      title:'📊  FILTROS DEL PIPELINE',
      sub:'SECCIÓN 2.1  //  FM-OA-2026',
      body:'La barra de estadísticas muestra tu pipeline:\n<b>Clientes · POC · Socios · Prospectos · Sin contacto · Frescos</b>\n\nHaz clic en <b>PROSPECTOS</b> para centrarte en los objetivos no convertidos.\n\n<i>En España llamamos a esto la cantera. Aquí está organizada, así que no hay excusas.</i>',
      btn:'COMPRENDIDO  →',
    },
    company_panel: {
      title:'🏢  EL DOSSIER',
      sub:'SECCIÓN 3  //  FM-OA-2026',
      body:'Haz clic en cualquier empresa para abrir su perfil completo. <b>Once secciones desplegables</b> se cargan desde la base de datos en tiempo real:\n\nContactos · Noticias · Ángulo · Email · Lemlist · Productos · Mapper · Relaciones\n\nTodo eso. Un solo clic.',
      btn:'ADELANTE  →',
      achievement:{name:'OJOS ABIERTOS',desc:'Abrió un dossier de empresa'},
    },
    outreach_angle: {
      title:'💡  ÁNGULO DE CONTACTO  +  PERSONAS',
      sub:'SECCIÓN 5  //  FM-OA-2026',
      body:'Abre cualquier empresa → despliega <b>💡 Ángulo de Contacto</b> → haz clic en <b>↺ Regen</b>.\n\nAparecen <b>10 botones de persona</b>. Cada uno escribe con una voz diferente:\n🍎 Steve — minimalista · ⚡ Jeff — métricas · 📦 Gary — directo\n🌊 Maya — narrativa · 🏛 Winston — épico\n\n<i>Winston es el que escribe como si vendiera el último trozo de Gibraltar. Úsalo con moderación.</i>',
      btn:'¡EXCELENTE!  →',
      achievement:{name:'MAESTRO DE PALABRAS',desc:'Descubrió el sistema de personas'},
    },
    ai_bar: {
      title:'🤖  BARRA DE CONSULTA IA',
      sub:'SECCIÓN 5.1  //  FM-OA-2026',
      body:'La barra de IA filtra tu lista usando lenguaje natural.\n\nEscribe <b>"high ICP no outreach"</b> o haz clic en el chip <b>No angle</b>. La lista muestra instantáneamente las empresas de alto potencial sin ángulo.\n\n<i>El lunes por la mañana empieza aquí. No en la cafetera. Bueno, en ambos.</i>',
      btn:'ALTO Y CLARO  →',
      hint:'CONSEJO: Los chips rápidos cubren las consultas más frecuentes',
    },
    compose: {
      title:'✉  COMPOSITOR MEESEEKS',
      sub:'SECCIÓN 5.2  //  FM-OA-2026',
      body:'Haz clic en <b>✉ Compose</b> en la barra de navegación (arriba a la derecha).\n\nElige empresa → elige contacto → elige persona → haz clic en <b>✉ Generar Email</b>.\n\nAsunto + cuerpo completo en ~3 segundos. Cambia una frase. Envía. Llévate el mérito.',
      btn:'MISIÓN CUMPLIDA  →',
      achievement:{name:'PRIMER CONTACTO',desc:'Descubrió el Compositor Meeseeks'},
    },
    gmail: {
      title:'📧  CONECTAR GMAIL',
      sub:'SECCIÓN 4.1  //  FM-OA-2026',
      body:'El hub puede escanear tu bandeja de entrada de Gmail para:\n• Encontrar hilos existentes con cualquier empresa\n• Extraer nombres y emails de contactos\n• Mostrar historial de relaciones\n\nLos operadores con Gmail conectado ven <b>3× más datos de contacto</b>. Tarda 10 segundos.\n\n<i>Esto sí que no se puede dejar para mañana. Mañana ya habrás olvidado dónde está el botón.</i>',
      btn:'⚡ CONECTAR GMAIL',
      btnAlt:'AHORA NO',
      achievement:{name:'ASALTANTE DE INBOX',desc:'Conectó Gmail para inteligencia relacional'},
    },
    complete: {
      title:'🏆  OPERADOR CERTIFICADO',
      sub:'INSTRUCCIÓN COMPLETA  //  TODOS LOS OBJETIVOS SUPERADOS',
      body:'¡Estás autorizado para operaciones en solitario!\n\nEl <b>Manual de Campo FM-OA-2026</b> describe cada función en detalle — está en tu carpeta de descargas.\n\nVe a encontrar socios de datos.\n\n<i>Y recuerda: en ventas como en flamenco — hay que sentirlo antes de ejecutarlo.</i>',
      btn:'VOLVER AL CENTRO  ⇒',
    },
  },

  /* ══════════════════════════════════════════════════════════════════
     🇺🇦  УКРАЇНСЬКА — Козацький дух. Незламність.
     ══════════════════════════════════════════════════════════════════ */
  uk: {
    welcome: {
      title:'★  ОПЕРАТИВНИЙ БРИФІНГ  ★',
      sub:'Підготовка Оператора — Послідовність Розпочата',
      body:'Ласкаво просимо до <b>Центру Розвідки Продажів</b>.\n\nВи ось-ось станете дуже небезпечною людиною на будь-якій B2B-зустрічі. Це навчання займає 5 хвилин. Решта — у посібнику <b>FM-OA-2026</b>.\n\n<i>Ми не здаємося. Ми знаходимо нових партнерів з даними.</i>',
      btn:'РОЗПОЧАТИ НАВЧАННЯ  ▶',
      achievement:{name:'ЗАРАХОВАНИЙ',desc:'Приєднався до корпусу операторів'},
    },
    company_list: {
      title:'📋  СПИСОК КОМПАНІЙ',
      sub:'РОЗДІЛ 2  //  FM-OA-2026',
      body:'<b>2 062 компанії</b>. Відсортовані за оцінкою ICP — найкращі можливості зверху.\n\nНатисніть на будь-який рядок, щоб відкрити досьє. Цей список — ваш цілий всесвіт цілей.\n\n<i>Козак знає ворога в обличчя. Оператор знає своїх клієнтів напам\'ять.</i>',
      btn:'ПРИЙНЯТО  →',
      hint:'ПОРАДА: Правий клік на рядку — 8 швидких дій',
    },
    stats_bar: {
      title:'📊  ФІЛЬТРИ ВОРОНКИ',
      sub:'РОЗДІЛ 2.1  //  FM-OA-2026',
      body:'Рядок статистики показує розподіл воронки:\n<b>Клієнти · POC · Партнери · Проспекти · Без контакту · Свіжі</b>\n\nНатисніть <b>ПРОСПЕКТИ</b>, щоб зосередитися на цілях, які ще не конвертовано.',
      btn:'ЗРОЗУМІЛО  →',
    },
    company_panel: {
      title:'🏢  ДОСЬЄ КОМПАНІЇ',
      sub:'РОЗДІЛ 3  //  FM-OA-2026',
      body:'Натисніть на будь-яку компанію, щоб відкрити повний профіль. <b>Одинадцять секцій</b> завантажуються з бази даних у реальному часі:\n\nКонтакти · Новини · Кут Охоплення · Листи · Lemlist · Продукти · Маппер · Зв\'язки\n\nВсе. Один клік.',
      btn:'ПРОДОВЖИТИ  →',
      achievement:{name:'ОЧІ ВІДКРИТІ',desc:'Відкрив досьє компанії'},
    },
    outreach_angle: {
      title:'💡  КУТ ОХОПЛЕННЯ  +  ПЕРСОНИ',
      sub:'РОЗДІЛ 5  //  FM-OA-2026',
      body:'Відкрийте компанію → розгорніть <b>💡 Кут Охоплення</b> → натисніть <b>↺ Перегенерувати</b>.\n\n<b>10 кнопок персони</b>. Кожна пише абсолютно іншим голосом:\n🍎 Стів — мінімалізм · ⚡ Джефф — метрики · 📦 Гері — прямолінійність\n🌊 Майя — наратив · 🏛 Вінстон — драматизм\n\n<i>Ворог не спить — і наш AI теж.</i>',
      btn:'ВІДМІННО  →',
      achievement:{name:'МАЙСТЕР СЛОВА',desc:'Відкрив систему персон'},
    },
    ai_bar: {
      title:'🤖  РЯДОК ЗАПИТІВ ДО AI',
      sub:'РОЗДІЛ 5.1  //  FM-OA-2026',
      body:'Рядок AI внизу лівої панелі фільтрує список компаній природною мовою.\n\nВведіть <b>"high ICP no outreach"</b> або натисніть чіп <b>No angle</b>. Список миттєво показує компанії з високим потенціалом без написаного кута.\n\n<i>Понеділковий ранок починається тут. Ворог не спить — і ми теж.</i>',
      btn:'ГУЧНО І ЗРОЗУМІЛО  →',
      hint:'ПОРАДА: Швидкі чіпи охоплюють найпоширеніші запити',
    },
    compose: {
      title:'✉  КОМПОНУВАЛЬНИК MEESEEKS',
      sub:'РОЗДІЛ 5.2  //  FM-OA-2026',
      body:'Натисніть <b>✉ Compose</b> у навігації (вгорі праворуч).\n\nОберіть компанію → оберіть контакт → оберіть персону → <b>✉ Згенерувати Лист</b>.\n\nТема + повний текст листа за ~3 секунди. Відредагуйте одне речення. Надішліть. Заберіть славу.',
      btn:'МІСІЯ ВИКОНАНА  →',
      achievement:{name:'ПЕРШИЙ КОНТАКТ',desc:'Відкрив Компонувальник Meeseeks'},
    },
    gmail: {
      title:'📧  ПІДКЛЮЧИТИ GMAIL',
      sub:'РОЗДІЛ 4.1  //  FM-OA-2026',
      body:'Хаб може просканувати вашу поштову скриньку Gmail:\n• Знайдіть наявні ланцюжки листів з будь-якою компанією\n• Витягніть імена та адреси контактів\n• Покажіть історію стосунків\n\nОператори з підключеним Gmail бачать <b>у 3× більше контактних даних</b>. Займає 10 секунд.\n\n<i>Розвідка без джерел — це просто здогадки. Підключіть Gmail. Це наказ.</i>',
      btn:'⚡ ПІДКЛЮЧИТИ GMAIL',
      btnAlt:'ПРОПУСТИТИ',
      achievement:{name:'РЕЙДЕР СКРИНЬКИ',desc:'Підключив Gmail для розвідки стосунків'},
    },
    complete: {
      title:'🏆  ОПЕРАТОР СЕРТИФІКОВАНИЙ',
      sub:'НАВЧАННЯ ЗАВЕРШЕНО  //  УСІ ЦІЛІ ДОСЯГНУТО',
      body:'Ви тепер допущені до самостійних операцій.\n\n<b>Польовий Посібник FM-OA-2026</b> описує кожну функцію детально — перевірте папку завантажень.\n\nЙдіть і знаходьте партнерів з даними.\n\n<i>Все буде добре. А з цим інструментом — навіть краще.</i>',
      btn:'ПОВЕРНУТИСЯ ДО ЦЕНТРУ  ⇒',
    },
  },

  /* ══════════════════════════════════════════════════════════════════
     🌐  MEDŽUSLOVJANSKY (Latin script — International Slavic)
     Styl: Vojensky manual. Humor za vsih Slovjanov.
     Čitajut Poljaci, Čehi, Slovaki, Horváty, Srby, Ukraincy, Rusy.
     ══════════════════════════════════════════════════════════════════ */
  isv: {
    welcome: {
      title:'★  OPERATORSKY BRIFING  ★',
      sub:'Vvedenje Operatora — Sekvencija Počinajet',
      body:'Dobrodošli v <b>Centru Prodajnoj Razvedky</b>.\n\nSkoro budete opasna osoba na každom B2B zasedanju. Učenje traje 5 minut. Vsë ostalo jest v priručniku — <b>FM-OA-2026</b>.\n\n<i>Zabavna činjeniсa: Medžuslovjansky razumejut Poljaci, Čehi, Slovaki, Horvaty, Srby, Ukraincy, Rusy — i nikto ne jest siguren komu jest to nameneno.</i>',
      btn:'POČINATI UČENJE  ▶',
      achievement:{name:'ZAPISAN',desc:'Pristapil do korpusa operatorov'},
    },
    company_list: {
      title:'📋  SEZNAM KOMPANIJ',
      sub:'RAZDEL 2  //  FM-OA-2026',
      body:'<b>2 062 kompaniji</b>. Sortirovany po ICP ocenke — najlepša priložnost na vrhu.\n\nKlikni na red za otvaranje dosje. Toj seznam jest tvoj cel universum ciljov. Skrolaj. Filtruraj. Ovladaj.\n\n<i>Vse slovjanskie jezyki imajut slovo za "prodavati". Znači sme gotovi.</i>',
      btn:'RAZUMLJENO  →',
      hint:'SOVET: Desny klik na red — 8 brzych akcij',
    },
    stats_bar: {
      title:'📊  FILTRY TRUBOPROVODA',
      sub:'RAZDEL 2.1  //  FM-OA-2026',
      body:'Statistična lenta pokazuje razdelenje truboprovoda:\n<b>Klijenty · POC · Partnery · Prospekty · Bez kontakta · Svježi</b>\n\nKlikni <b>PROSPEKTY</b> za fokus na cely, ktore ješče ne sut konvertirovany.\n\n<i>Slovo "prospekt" razumejut vsi Slo­vjane. Konceptu takože.</i>',
      btn:'SČHVAČENO  →',
    },
    company_panel: {
      title:'🏢  DOSJE KOMPANIJI',
      sub:'RAZDEL 3  //  FM-OA-2026',
      body:'Klikni na kompaniju za otvaranje polnogo profila. <b>Jedanaest sekcij</b> se učitavajut iz bazy v realnom vremenu:\n\nKontakty · Novosti · Ugol Pristupa · Pisma · Lemlist · Produkty · Mapper · Svjazy\n\nVsë. Jedan klik.',
      btn:'NAPRED  →',
      achievement:{name:'OČI OTVORENY',desc:'Otvoril dosje kompaniji'},
    },
    outreach_angle: {
      title:'💡  UGOL PRISTUPA  +  PERSONY',
      sub:'RAZDEL 5  //  FM-OA-2026',
      body:'Otvori kompaniju → razširi <b>💡 Ugol Pristupa</b> → klikni <b>↺ Regenerisati</b>.\n\n<b>10 dugmadi persony</b>. Každa piše sasvijem različitym glasom:\n🍎 Stiv — minimalizm · ⚡ Jeff — metriky · 📦 Gary — direktno\n🌊 Maja — naracija · 🏛 Vinston — patos\n\n<i>Ako ne znate ktoru personu izbrati: Gary za Zapadne Slo­vjane, Winston za Istočne Slo­vjane.</i>',
      btn:'ODLIČNO  →',
      achievement:{name:'MAJSTOR REČI',desc:'Otkril sistem personov'},
    },
    ai_bar: {
      title:'🤖  LENTA AI ZAPITOV',
      sub:'RAZDEL 5.1  //  FM-OA-2026',
      body:'Lenta AI na dnu levoj lenty filtrujet seznam kompanij pomočju prirodnogo jezyka.\n\nUpiši <b>"high ICP no outreach"</b> ili klikni čip <b>No angle</b>. Seznam trenuto pokazuje kompaniji z velikim potencialom bez napisanogo ugla.\n\n<i>AI razumejet vse Slovjanskie jezyki. Ili bar tvrdi, čto razumejet. Isto kako i my.</i>',
      btn:'GLASNO I JASNO  →',
      hint:'SOVET: Brzye čipy pokrivajut najčešče upity',
    },
    compose: {
      title:'✉  KOMPONIST MEESEEKS',
      sub:'RAZDEL 5.2  //  FM-OA-2026',
      body:'Klikni <b>✉ Compose</b> v navigaciji (gore desno).\n\nIzberi kompaniju → izberi kontakt → izberi personu → <b>✉ Generisati Pismo</b>.\n\nTema + pun tekst pisma za ~3 sekunde. Izmeni jednu rečenicu. Pošlji. Uzmi hvalu.',
      btn:'MISIJA ZAVRŠENA  →',
      achievement:{name:'PRVI KONTAKT',desc:'Otkril Komponista Meeseeks'},
    },
    gmail: {
      title:'📧  POVEZATI GMAIL',
      sub:'RAZDEL 4.1  //  FM-OA-2026',
      body:'Hub možet skenirati tvoj Gmail:\n• Najdi posuščestvujušče niti s kompanijami\n• Izvleci imena i emajly kontaktov\n• Pokaži istoriju otnošenij\n\nOperatory s povezanym Gmail-om videt <b>3× više kontaktnych dannych</b>. Traje 10 sekund.\n\n<i>Razvedka bez istočnikov nije razvedka — to jest folklor. Poveži Gmail.</i>',
      btn:'⚡ POVEZATI GMAIL',
      btnAlt:'PRESKOČITI',
      achievement:{name:'RAJDER SANDUČE',desc:'Povezal Gmail za razvedku otnošenij'},
    },
    complete: {
      title:'🏆  OPERATOR SERTIFICIROVAN',
      sub:'UČENJE ZAVRŠENO  //  VSI CILJI DOSTIHNUTI',
      body:'Jeste teper odobreny za samostalne operacije.\n\n<b>Terensko Rukovodstvo FM-OA-2026</b> opisujet každu funkciju — proverite folder preuzimanja.\n\nIdite i najdite partnerov za dannyje.\n\n<i>Srečno — ili kak se kaže na vsih Slovjanskih jezykah odjednom: Dobro! Dobre! Dobré! Dobro! Dober!</i>',
      btn:'POVRATAK V CENTAR  ⇒',
    },
  },

  /* ══════════════════════════════════════════════════════════════════
     🇵🇭  FILIPINO — Diskarte. Laban. Panalo.
     BPO capital ng mundo. Diskarte over everything.
     ══════════════════════════════════════════════════════════════════ */
  tl: {
    welcome: {
      title:'★  INTELLIGENCE BRIEFING  ★',
      sub:'Pagsisimula ng Operator — Sequence Nagsimula Na',
      body:'Maligayang pagdating sa <b>Sales Intelligence Hub</b>.\n\nMalapit ka nang maging mapanganib sa anumang B2B meeting. 5 minuto lang ang training. Ang iba ay nasa manual — <b>FM-OA-2026</b>.\n\n<i>Tandaan: Ang diskarte ng Pilipino sa sales — relasyon muna, KPI mamaya. Dito, mayroon kang dalawa.</i>',
      btn:'SIMULAN ANG TRAINING  ▶',
      achievement:{name:'NAKA-ENLIST NA',desc:'Sumali sa corps ng mga operator'},
    },
    company_list: {
      title:'📋  LISTAHAN NG MGA KUMPANYA',
      sub:'SEKSYON 2  //  FM-OA-2026',
      body:'<b>2,062 na kumpanya</b>. Naayos ayon sa ICP score — pinakamataas na potensyal sa itaas.\n\nI-click ang anumang row para buksan ang dossier. Ito ang buong universe ng iyong mga target. I-scroll. I-filter. Angkinin.\n\n<i>Grabe, maraming kumpanya! Huwag mag-alala — alam ng AI kung alin ang mahalaga.</i>',
      btn:'NAIINTINDIHAN  →',
      hint:'TIP: Right-click sa anumang row — 8 mabilis na aksyon',
    },
    stats_bar: {
      title:'📊  PIPELINE FILTERS',
      sub:'SEKSYON 2.1  //  FM-OA-2026',
      body:'Ipinapakita ng stats bar ang breakdown ng iyong pipeline:\n<b>Clients · POC · Partners · Prospects · No Outreach · Fresh</b>\n\nI-click ang <b>PROSPECTS</b> para mag-focus sa mga target na hindi pa na-convert. Iyon ang iyong hunting ground.\n\n<i>Sa BPO, tinatawag namin itong "pipeline" din. Dito, mas maayos.</i>',
      btn:'NAKA-GETS NA  →',
    },
    company_panel: {
      title:'🏢  ANG DOSSIER',
      sub:'SEKSYON 3  //  FM-OA-2026',
      body:'I-click ang anumang kumpanya para buksan ang buong profile. <b>Labing-isang collapsible na seksyon</b> ang naglo-load mula sa database sa real time:\n\nKontacts · Balita · Outreach Angle · Email History · Lemlist · Produkto · Segment Mapper · Relasyon\n\nLahat yan. Isang click lang.',
      btn:'TULOY  →',
      achievement:{name:'BUKAS ANG MATA',desc:'Binuksan ang dossier ng isang kumpanya'},
    },
    outreach_angle: {
      title:'💡  OUTREACH ANGLE  +  MGA PERSONA',
      sub:'SEKSYON 5  //  FM-OA-2026',
      body:'Buksan ang kumpanya → palawakin ang <b>💡 Outreach Angle</b> → i-click ang <b>↺ Regen</b>.\n\nLalabas ang <b>10 persona buttons</b>. Iba-iba ang boses ng bawat isa:\n🍎 Steve — minimal · ⚡ Jeff — numbers · 📦 Gary — walang arte\n🌊 Maya — kwento · 🏛 Winston — dramatic\n\n<i>Kung BPO ka dati, ikaw na ang expert sa tone-matching. Gamitin mo yan dito.</i>',
      btn:'MAGALING!  →',
      achievement:{name:'WORD WIZARD',desc:'Natuklasan ang sistema ng mga persona'},
    },
    ai_bar: {
      title:'🤖  AI QUERY BAR',
      sub:'SEKSYON 5.1  //  FM-OA-2026',
      body:'Ang AI bar sa ibaba ng kaliwang panel ay nag-filter ng listahan ng kumpanya gamit ang natural na wika.\n\nI-type ang <b>"high ICP no outreach"</b> o i-click ang <b>No angle</b> chip. Agad na makikita ang mga kumpanyang may mataas na potensyal pero walang angle pa.\n\n<i>Lunes ng umaga. Kape pa lang. AI, magsimula na.</i>',
      btn:'COPY THAT  →',
      hint:'TIP: Gamitin ang quick chips para sa pinakakaraniwang queries',
    },
    compose: {
      title:'✉  MEESEEKS COMPOSER',
      sub:'SEKSYON 5.2  //  FM-OA-2026',
      body:'I-click ang <b>✉ Compose</b> sa nav (kanang itaas). Magbubukas ang Meeseeks Composer.\n\nPiliin ang kumpanya → piliin ang contact → pumili ng persona → i-click ang <b>✉ Generate Email</b>.\n\nSubject line + buong email body sa ~3 segundo. Baguhin ang isang linya. Ipadala. Kumuha ng papuri.',
      btn:'MISSION CLEAR  →',
      achievement:{name:'FIRST CONTACT',desc:'Natuklasan ang Meeseeks Composer'},
    },
    gmail: {
      title:'📧  I-CONNECT ANG GMAIL',
      sub:'SEKSYON 4.1  //  FM-OA-2026',
      body:'Kayang i-scan ng hub ang iyong Gmail inbox para:\n• Hanapin ang mga kasalukuyang thread sa anumang kumpanya\n• I-extract ang mga pangalan at email ng contacts\n• Ipakita ang kasaysayan ng relasyon\n\nAng mga operator na naka-connect ang Gmail ay nakakakita ng <b>3× mas maraming contact data</b>. 10 segundo lang.\n\n<i>Networking kapamilya, networking sa trabaho, networking sa deals — Filipino speciality. Gmail ang simula.</i>',
      btn:'⚡ I-CONNECT ANG GMAIL',
      btnAlt:'PRESTO NA',
      achievement:{name:'INBOX RAIDER',desc:'Ni-connect ang Gmail para sa relationship intelligence'},
    },
    complete: {
      title:'🏆  CERTIFIED NA ANG OPERATOR',
      sub:'TRAINING COMPLETE  //  LAHAT NG OBJECTIVES CLEARED',
      body:'Cleared ka na para sa solo operations.\n\nAng <b>Field Manual FM-OA-2026</b> ay nagdedetalye ng bawat feature — tingnan ang iyong downloads folder.\n\nHanapin na ang mga data partners.\n\n<i>Laban! Diskarte mo na ito. Panalo ka na bago pa magsimula.</i>',
      btn:'BUMALIK SA HUB  ⇒',
    },
  },

};
