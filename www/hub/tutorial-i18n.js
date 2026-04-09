/* ═══ tutorial-i18n.js — Language packs for the onAudience Tutorial ═══
   5 languages: EN · PL · ES · UK · ISV
   Each pack overrides step fields by step id.
   FM military style maintained in all languages.
   Cultural jokes are language-specific — not translated from English.
   ════════════════════════════════════════════════════════════════════ */

export const LANG_META = {
  en:  { flag: '🇬🇧', label: 'EN',  name: 'English'          },
  pl:  { flag: '🇵🇱', label: 'PL',  name: 'Polski'           },
  es:  { flag: '🇪🇸', label: 'ES',  name: 'Español'          },
  uk:  { flag: '🇺🇦', label: 'UA',  name: 'Українська'       },
  isv: { flag: '🌐', label: 'ISV', name: 'Меджусловjaнскы'  },
};

export const STEP_I18N = {

  /* ══════════════════════════════════════════════════════════════════
     🇵🇱  POLSKI
     Styl: Wojskowy rozkaz. Czarny humor. Relacje ponad wszystko.
     Żołnierz wie, że bez danych partnerów nie ma nic.
     ══════════════════════════════════════════════════════════════════ */
  pl: {
    welcome: {
      title: '★  ODPRAWA OPERACYJNA  ★',
      sub: 'Wdrożenie Operatora — Sekwencja Zainicjowana',
      body: 'Witamy w <b>Centrum Wywiadu Sprzedażowego</b>.\n\nZa chwilę staniesz się niebezpieczną osobą na każdym spotkaniu B2B. Szkolenie trwa 5 minut. Resztę znajdziesz w podręczniku — <b>FM-OA-2026</b>.\n\n<i>Uwaga: W Polsce kontakty są ważniejsze niż dane. Tu masz oba.</i>',
      btn: 'ROZPOCZNIJ SZKOLENIE  ▶',
      achievement: { name: 'ZACIĄGNIĘTY', desc: 'Dołączył do korpusu operatorów' },
    },
    company_list: {
      title: '📋  LISTA FIRM',
      sub: 'SEKCJA 2  //  FM-OA-2026',
      body: '<b>2 062 firmy</b>. Posortowane według wyniku ICP — najlepsza szansa na górze.\n\nKliknij dowolny wiersz, aby otworzyć teczkę firmy. To Twój cały wszechświat targetów. Przewijaj. Filtruj. Opanuj.\n\n<i>Tyle firm, a wciąż nie wiadomo, z którą zacząć. Typowe.</i>',
      btn: 'ZROZUMIAŁEM  →',
      hint: 'WSKAZÓWKA: Kliknij prawym przyciskiem wiersz — 8 szybkich akcji',
    },
    stats_bar: {
      title: '📊  FILTRY PIPELINE\'U',
      sub: 'SEKCJA 2.1  //  FM-OA-2026',
      body: 'Pasek statystyk pokazuje podział pipeline\'u:\n<b>Klienci · POC · Partnerzy · Prospekty · Brak kontaktu · Świeże</b>\n\nKliknij <b>PROSPEKTY</b>, aby skupić się na celach, które jeszcze nie zostały pozyskane. To Twój główny teren łowiecki.\n\n<i>„Prospekt" po polsku brzmi jak coś chemicznego. Tu chodzi o pieniądze.</i>',
      btn: 'POJĄŁEM  →',
    },
    company_panel: {
      title: '🏢  TECZKA FIRMY',
      sub: 'SEKCJA 3  //  FM-OA-2026',
      body: 'Kliknij dowolną firmę, aby otworzyć pełny profil. <b>Jedenaście sekcji</b> ładuje się z bazy danych w czasie rzeczywistym:\n\nKontakty · Wiadomości · Kąt Dotarcia · Historia Maili · Lemlist · Produkty · Mapper Segmentów · Relacje\n\nWszystko. Jeden klik.',
      btn: 'DALEJ  →',
      achievement: { name: 'OCZY OTWARTE', desc: 'Otworzył teczkę firmy' },
    },
    outreach_angle: {
      title: '💡  KĄT DOTARCIA  +  PERSONY',
      sub: 'SEKCJA 5  //  FM-OA-2026',
      body: 'Otwórz firmę → rozwiń <b>💡 Kąt Dotarcia</b> → kliknij <b>↺ Regeneruj</b>.\n\nPojawiają się <b>10 przycisków persony</b>. Każda pisze zupełnie innym głosem:\n🍎 Steve — minimalizm · ⚡ Jeff — liczby · 📦 Gary — bez owijania w bawełnę\n🌊 Maya — narracja · 🏛 Winston — patos\n\n<i>Gary to ten gość z Torunia, który mówi wprost co myśli. Używaj z rozwagą.</i>',
      btn: 'DOSKONALE  →',
      achievement: { name: 'SŁOWOTWÓRCA', desc: 'Odkrył system person' },
    },
    ai_bar: {
      title: '🤖  PASEK ZAPYTAŃ AI',
      sub: 'SEKCJA 5.1  //  FM-OA-2026',
      body: 'Pasek AI na dole lewego panelu filtruje listę firm za pomocą języka naturalnego.\n\nWpisz <b>„high ICP no outreach"</b> lub kliknij chip <b>No angle</b>. Lista natychmiast pokazuje tylko firmy o wysokim potencjale bez napisanego kąta.\n\n<i>Poniedziałkowy poranek. Kawa jeszcze nie działa. AI już tak.</i>',
      btn: 'ODBIERAM  →',
      hint: 'WSKAZÓWKA: Chipy szybkiego dostępu obsługują najczęstsze zapytania',
    },
    compose: {
      title: '✉  KOMPOZYTOR MEESEEKS',
      sub: 'SEKCJA 5.2  //  FM-OA-2026',
      body: 'Kliknij <b>✉ Compose</b> w nawigacji (prawy górny róg). Otwiera się Kompozytor Meeseeks.\n\nWybierz firmę → wybierz kontakt → wybierz personę → kliknij <b>✉ Wygeneruj Email</b>.\n\nTemat + pełna treść maila w ~3 sekundy. Popraw jedno zdanie. Wyślij. Bierz chwałę.',
      btn: 'MISJA ZALICZONA  →',
      achievement: { name: 'PIERWSZY KONTAKT', desc: 'Odkrył Kompozytora Meeseeks' },
    },
    gmail: {
      title: '📧  POŁĄCZ GMAIL',
      sub: 'SEKCJA 4.1  //  FM-OA-2026',
      body: 'Hub może przeskanować Twoją skrzynkę Gmail:\n• Znajdź istniejące wątki z dowolną firmą\n• Wyodrębnij imiona i emaile kontaktów\n• Pokaż historię relacji w sekcji Historia Maili\n\nOperatorzy z połączonym Gmailem widzą <b>3× więcej danych kontaktowych</b>. Zajmuje 10 sekund.\n\n<i>W Polsce i tak wszystko załatwia się przez telefon. Ale emaile też się przydają.</i>',
      btn: '⚡ POŁĄCZ GMAIL',
      btnAlt: 'POMIŃ NA RAZIE',
      achievement: { name: 'RAJDER SKRZYNKI', desc: 'Połączył Gmail dla wywiadu relacyjnego' },
    },
    complete: {
      title: '🏆  OPERATOR CERTYFIKOWANY',
      sub: 'SZKOLENIE UKOŃCZONE  //  WSZYSTKIE CELE ZREALIZOWANE',
      body: 'Masz teraz zezwolenie na samodzielne operacje.\n\n<b>Podręcznik Polowy FM-OA-2026</b> opisuje każdą funkcję szczegółowo — sprawdź folder pobrań.\n\nIdź i znajdź partnerów danych.\n\n<i>Powodzenia. W Polsce mówi się: „Jakoś to będzie." Tu jednak wiemy, że będzie dobrze.</i>',
      btn: 'POWRÓT DO CENTRUM  ⇒',
    },
  },

  /* ══════════════════════════════════════════════════════════════════
     🇪🇸  ESPAÑOL
     Estilo: Manual militar con pasión mediterránea.
     El vendedor español no vende — seduce.
     ══════════════════════════════════════════════════════════════════ */
  es: {
    welcome: {
      title: '★  INFORME DE INTELIGENCIA  ★',
      sub: 'Incorporación del Operador — Secuencia Iniciada',
      body: 'Bienvenido al <b>Centro de Inteligencia de Ventas</b>.\n\n¡Estás a punto de convertirte en una persona muy peligrosa en cualquier reunión B2B! Esta instrucción dura 5 minutos. El resto está en el manual — <b>FM-OA-2026</b>.\n\n<i>Nota del mando: No lo dejes para mañana. Lo decimos en serio esta vez.</i>',
      btn: 'COMENZAR INSTRUCCIÓN  ▶',
      achievement: { name: 'RECLUTADO', desc: 'Se incorporó al cuerpo de operadores' },
    },
    company_list: {
      title: '📋  LA LISTA DE EMPRESAS',
      sub: 'SECCIÓN 2  //  FM-OA-2026',
      body: '<b>2.062 empresas</b>. Ordenadas por puntuación ICP — la mejor oportunidad primero.\n\nHaz clic en cualquier fila para abrir el dossier. Esta lista es todo tu universo de objetivos. Desplázala. Filtrala. Conquístala.\n\n<i>¡Madre mía, cuántas empresas! Tranquilo — el AI sabe cuáles importan.</i>',
      btn: 'ENTENDIDO  →',
      hint: 'CONSEJO: Clic derecho en cualquier fila — 8 acciones rápidas',
    },
    stats_bar: {
      title: '📊  FILTROS DEL PIPELINE',
      sub: 'SECCIÓN 2.1  //  FM-OA-2026',
      body: 'La barra de estadísticas muestra tu pipeline:\n<b>Clientes · POC · Socios · Prospectos · Sin contacto · Frescos</b>\n\nHaz clic en <b>PROSPECTOS</b> para centrarte en los objetivos no convertidos. Es tu principal zona de caza.\n\n<i>En España llamamos a esto «la cantera». Aquí está organizada, así que no hay excusas.</i>',
      btn: 'COMPRENDIDO  →',
    },
    company_panel: {
      title: '🏢  EL DOSSIER',
      sub: 'SECCIÓN 3  //  FM-OA-2026',
      body: 'Haz clic en cualquier empresa para abrir su perfil completo. <b>Once secciones desplegables</b> se cargan desde la base de datos en tiempo real:\n\nContactos · Noticias · Ángulo de Contacto · Historial de Email · Lemlist · Productos · Mapper · Relaciones\n\nTodo eso. Un solo clic.',
      btn: 'ADELANTE  →',
      achievement: { name: 'OJOS ABIERTOS', desc: 'Abrió un dossier de empresa' },
    },
    outreach_angle: {
      title: '💡  ÁNGULO DE CONTACTO  +  PERSONAS',
      sub: 'SECCIÓN 5  //  FM-OA-2026',
      body: 'Abre cualquier empresa → despliega <b>💡 Ángulo de Contacto</b> → haz clic en <b>↺ Regen</b>.\n\nAparecen <b>10 botones de persona</b>. Cada uno escribe con una voz completamente diferente:\n🍎 Steve — minimalista · ⚡ Jeff — métricas · 📦 Gary — directo\n🌊 Maya — narrativa · 🏛 Winston — épico\n\n<i>Winston es el que escribe como si vendiera el último trozo de Gibraltar. Úsalo con moderación.</i>',
      btn: '¡EXCELENTE!  →',
      achievement: { name: 'MAESTRO DE PALABRAS', desc: 'Descubrió el sistema de personas' },
    },
    ai_bar: {
      title: '🤖  BARRA DE CONSULTA IA',
      sub: 'SECCIÓN 5.1  //  FM-OA-2026',
      body: 'La barra de IA en la parte inferior del panel izquierdo filtra tu lista usando lenguaje natural.\n\nEscribe <b>\"high ICP no outreach\"</b> o haz clic en el chip <b>No angle</b>. La lista muestra instantáneamente solo las empresas de alto potencial sin ángulo escrito.\n\n<i>El lunes por la mañana empieza aquí. No en la cafetera. Bueno, en ambos.</i>',
      btn: 'ALTO Y CLARO  →',
      hint: 'CONSEJO: Los chips rápidos cubren las consultas más frecuentes',
    },
    compose: {
      title: '✉  COMPOSITOR MEESEEKS',
      sub: 'SECCIÓN 5.2  //  FM-OA-2026',
      body: 'Haz clic en <b>✉ Compose</b> en la barra de navegación (arriba a la derecha). Se abre el Compositor Meeseeks.\n\nElige empresa → elige contacto → elige persona → haz clic en <b>✉ Generar Email</b>.\n\nAsunto + cuerpo completo en ~3 segundos. Cambia una frase. Envía. Llévate el mérito.',
      btn: 'MISIÓN CUMPLIDA  →',
      achievement: { name: 'PRIMER CONTACTO', desc: 'Descubrió el Compositor Meeseeks' },
    },
    gmail: {
      title: '📧  CONECTAR GMAIL',
      sub: 'SECCIÓN 4.1  //  FM-OA-2026',
      body: 'El hub puede escanear tu bandeja de entrada de Gmail para:\n• Encontrar hilos existentes con cualquier empresa\n• Extraer nombres y emails de contactos\n• Mostrar historial de relaciones\n\nLos operadores con Gmail conectado ven <b>3× más datos de contacto</b>. Tarda 10 segundos.\n\n<i>Esto sí que no se puede dejar para mañana. Mañana ya habrás olvidado dónde está el botón.</i>',
      btn: '⚡ CONECTAR GMAIL',
      btnAlt: 'AHORA NO',
      achievement: { name: 'ASALTANTE DE INBOX', desc: 'Conectó Gmail para inteligencia relacional' },
    },
    complete: {
      title: '🏆  OPERADOR CERTIFICADO',
      sub: 'INSTRUCCIÓN COMPLETA  //  TODOS LOS OBJETIVOS SUPERADOS',
      body: '¡Estás autorizado para operaciones en solitario!\n\nEl <b>Manual de Campo FM-OA-2026</b> describe cada función en detalle — está en tu carpeta de descargas.\n\nVe a encontrar socios de datos. ¡Suerte, operador!\n\n<i>Y recuerda: en ventas como en flamenco — hay que sentirlo antes de ejecutarlo.</i>',
      btn: 'VOLVER AL CENTRO  ⇒',
    },
  },

  /* ══════════════════════════════════════════════════════════════════
     🇺🇦  УКРАЇНСЬКА
     Стиль: Козацький дух. Незламність. Продавати — значить перемагати.
     Оператор не здається. Оператор знаходить партнерів.
     ══════════════════════════════════════════════════════════════════ */
  uk: {
    welcome: {
      title: '★  ОПЕРАТИВНИЙ БРИФІНГ  ★',
      sub: 'Підготовка Оператора — Послідовність Розпочата',
      body: 'Ласкаво просимо до <b>Центру Розвідки Продажів</b>.\n\nВи ось-ось станете дуже небезпечною людиною на будь-якій B2B-зустрічі. Це навчання займає 5 хвилин. Решта — у посібнику <b>FM-OA-2026</b>.\n\n<i>Ми не здаємося. Ми знаходимо нових партнерів з даними.</i>',
      btn: 'РОЗПОЧАТИ НАВЧАННЯ  ▶',
      achievement: { name: 'ЗАРАХОВАНИЙ', desc: 'Приєднався до корпусу операторів' },
    },
    company_list: {
      title: '📋  СПИСОК КОМПАНІЙ',
      sub: 'РОЗДІЛ 2  //  FM-OA-2026',
      body: '<b>2 062 компанії</b>. Відсортовані за оцінкою ICP — найкращі можливості зверху.\n\nНатисніть на будь-який рядок, щоб відкрити досьє компанії. Цей список — весь ваш всесвіт цілей. Прокрутіть. Відфільтруйте. Оволодійте.\n\n<i>Козак знає ворога в обличчя. Оператор знає своїх клієнтів напам\'ять.</i>',
      btn: 'ПРИЙНЯТО  →',
      hint: 'ПОРАДА: Правий клік на будь-якому рядку — 8 швидких дій',
    },
    stats_bar: {
      title: '📊  ФІЛЬТРИ ВОРОНКИ',
      sub: 'РОЗДІЛ 2.1  //  FM-OA-2026',
      body: 'Рядок статистики показує розподіл воронки:\n<b>Клієнти · POC · Партнери · Проспекти · Без контакту · Свіжі</b>\n\nНатисніть <b>ПРОСПЕКТИ</b>, щоб зосередитися на цілях, які ще не конвертовано. Це ваш основний мисливський ареал.',
      btn: 'ЗРОЗУМІЛО  →',
    },
    company_panel: {
      title: '🏢  ДОСЬЄ КОМПАНІЇ',
      sub: 'РОЗДІЛ 3  //  FM-OA-2026',
      body: 'Натисніть на будь-яку компанію, щоб відкрити повний профіль. <b>Одинадцять секцій</b> завантажуються з бази даних у реальному часі:\n\nКонтакти · Новини · Кут Охоплення · Історія Листів · Lemlist · Продукти · Маппер · Зв\'язки\n\nВсе. Один клік.',
      btn: 'ПРОДОВЖИТИ  →',
      achievement: { name: 'ОЧІ ВІДКРИТІ', desc: 'Відкрив досьє компанії' },
    },
    outreach_angle: {
      title: '💡  КУТ ОХОПЛЕННЯ  +  ПЕРСОНИ',
      sub: 'РОЗДІЛ 5  //  FM-OA-2026',
      body: 'Відкрийте компанію → розгорніть <b>💡 Кут Охоплення</b> → натисніть <b>↺ Перегенерувати</b>.\n\nЗ\'являться <b>10 кнопок персони</b>. Кожна пише абсолютно іншим голосом:\n🍎 Стів — мінімалізм · ⚡ Джефф — метрики · 📦 Гері — прямолінійність\n🌊 Майя — наратив · 🏛 Вінстон — драматизм\n\n<i>Вінстон писав так, ніби захищав Британську Імперію. Ваш продукт теж заслуговує на пафос.</i>',
      btn: 'ВІДМІННО  →',
      achievement: { name: 'МАЙСТЕР СЛОВА', desc: 'Відкрив систему персон' },
    },
    ai_bar: {
      title: '🤖  РЯДОК ЗАПИТІВ ДО AI',
      sub: 'РОЗДІЛ 5.1  //  FM-OA-2026',
      body: 'Рядок AI внизу лівої панелі фільтрує список компаній природною мовою.\n\nВведіть <b>\"high ICP no outreach\"</b> або натисніть чіп <b>No angle</b>. Список миттєво показує лише компанії з високим потенціалом без написаного кута.\n\n<i>Понеділковий ранок починається тут. Ворог не спить — і ми теж.</i>',
      btn: 'ГУЧНО І ЗРОЗУМІЛО  →',
      hint: 'ПОРАДА: Швидкі чіпи охоплюють найпоширеніші запити',
    },
    compose: {
      title: '✉  КОМПОНУВАЛЬНИК MEESEEKS',
      sub: 'РОЗДІЛ 5.2  //  FM-OA-2026',
      body: 'Натисніть <b>✉ Compose</b> у навігації (вгорі праворуч). Відкривається Компонувальник Meeseeks.\n\nОберіть компанію → оберіть контакт → оберіть персону → натисніть <b>✉ Згенерувати Лист</b>.\n\nТема + повний текст листа за ~3 секунди. Відредагуйте одне речення. Надішліть. Заберіть славу.',
      btn: 'МІСІЯ ВИКОНАНА  →',
      achievement: { name: 'ПЕРШИЙ КОНТАКТ', desc: 'Відкрив Компонувальник Meeseeks' },
    },
    gmail: {
      title: '📧  ПІДКЛЮЧИТИ GMAIL',
      sub: 'РОЗДІЛ 4.1  //  FM-OA-2026',
      body: 'Хаб може просканувати вашу поштову скриньку Gmail:\n• Знайдіть наявні ланцюжки листів з будь-якою компанією\n• Витягніть імена та адреси контактів\n• Покажіть історію стосунків у розділі Історія Листів\n\nОператори з підключеним Gmail бачать <b>у 3× більше контактних даних</b>. Займає 10 секунд.\n\n<i>Розвідка без джерел — це просто здогадки. Підключіть Gmail. Це наказ.</i>',
      btn: '⚡ ПІДКЛЮЧИТИ GMAIL',
      btnAlt: 'ПРОПУСТИТИ',
      achievement: { name: 'РЕЙДЕР СКРИНЬКИ', desc: 'Підключив Gmail для розвідки стосунків' },
    },
    complete: {
      title: '🏆  ОПЕРАТОР СЕРТИФІКОВАНИЙ',
      sub: 'НАВЧАННЯ ЗАВЕРШЕНО  //  УСІ ЦІЛІ ДОСЯГНУТО',
      body: 'Ви тепер допущені до самостійних операцій.\n\n<b>Польовий Посібник FM-OA-2026</b> описує кожну функцію детально — перевірте папку завантажень.\n\nЙдіть і знаходьте партнерів з даними.\n\n<i>Все буде добре. А з цим інструментом — навіть краще.</i>',
      btn: 'ПОВЕРНУТИСЯ ДО ЦЕНТРУ  ⇒',
    },
  },

  /* ══════════════════════════════════════════════════════════════════
     🌐  МЕДЖУСЛОВJAНСКЫ (INTERSLAVIC)
     Стиль: Конструированы язык для всих Словjanов.
     Operator разумје. Operator продаje. Operator побěдžаje.
     (Linguistic nerds will appreciate the effort. Others will pretend to.)
     ══════════════════════════════════════════════════════════════════ */
  isv: {
    welcome: {
      title: '★  ОПЕРАТОРСКЫ БРИФИНГ  ★',
      sub: 'Введење Оператора — Секвенциja Починаje',
      body: 'Добро дошли до <b>Центра Продajнеj Разузнавалности</b>.\n\nКогда сте готови, будете опасна особа на каждом B2B зeтинку. Учење траje 5 минут. Всё остало je в руководству — <b>FM-OA-2026</b>.\n\n<i>Забавна чињеница: Меджусловjaнскы разумеjу Поляци, Чеси, Словаци, Хрвати, Срби, Украjинци, Руси — а никто ниje сигурен кому je то намьenjено.</i>',
      btn: 'ПОЧИНАТИ УЧЕЊЕ  ▶',
      achievement: { name: 'ЗАПИСАН', desc: 'Пристапил до корпуса операторов' },
    },
    company_list: {
      title: '📋  СПИСОК КОМПАНИJ',
      sub: 'РАЗДЕЛ 2  //  FM-OA-2026',
      body: '<b>2 062 компаниje</b>. Сортированы по ICP оценки — наjбоља прилика на врху.\n\nКликни на ред за отварање досjеа. Тaj список je твоj цел универзум. Скролaj. Фильтруj. Овладaj.\n\n<i>Все словjaнске jезыки имajу слово за „продавати". Значи сме готови.</i>',
      btn: 'РАЗУМLJЕНО  →',
      hint: 'СОВЕТ: Десни клик на ред — 8 брзых акциj',
    },
    stats_bar: {
      title: '📊  ФИЛЬТРЫ ТРУБОПРОВОДА',
      sub: 'РАЗДЕЛ 2.1  //  FM-OA-2026',
      body: 'Статистична лента показуje разделjeнje трубопровода:\n<b>Клиjенти · POC · Партнери · Проспекти · Без контакта · Свjeжи</b>\n\nКликни <b>ПРОСПЕКТИ</b> за фокус на цеjи кojи ниje jош конвертирани. То je тваj главни ловачки терен.\n\n<i>Слово „проспект" разумejу вси Словjани. Концепт такожде.</i>',
      btn: 'СХВАHEНО  →',
    },
    company_panel: {
      title: '🏢  ДОСJE КОМПАНИJE',
      sub: 'РАЗДЕЛ 3  //  FM-OA-2026',
      body: 'Кликни на компаниjу за отварање полного профила. <b>Jeданаест секциj</b> се учитаваjу из базе в реалном времену:\n\nКонтакти · Новости · Угал Приступа · Историja Писем · Lemlist · Продукти · Маппер · Везе\n\nВсe. Jeдан клик.',
      btn: 'НАПРЕj  →',
      achievement: { name: 'ОЧИ ОТВОРЕНЫ', desc: 'Отворил досje компаниje' },
    },
    outreach_angle: {
      title: '💡  УГАЛ ПРИСТУПА  +  ПЕРСОНЫ',
      sub: 'РАЗДЕЛ 5  //  FM-OA-2026',
      body: 'Отвори компаниjу → разшири <b>💡 Угал Приступа</b> → кликни <b>↺ Регенерисати</b>.\n\nПоjavлjаje се <b>10 дугмади персоны</b>. Каждо пишe сасвим различитым гласом:\n🍎 Стив — минимализм · ⚡ Jефф — метрике · 📦 Гэри — директно\n🌊 Маjа — нарациjа · 🏛 Винстон — патос\n\n<i>Ако не знате кojу персону изабрати: Gary за Западне Словjане, Winston за Источне Словjане.</i>',
      btn: 'ОДЛИЧНО  →',
      achievement: { name: 'МАjСТОР РЕЧИ', desc: 'Открил систем персон' },
    },
    ai_bar: {
      title: '🤖  ЛЕНТА AI ЗАПИТА',
      sub: 'РАЗДЕЛ 5.1  //  FM-OA-2026',
      body: 'Лента AI на дну левoj лени фильтруje список компаниj помоћу природног jезика.\n\nУпиши <b>„high ICP no outreach"</b> или кликни чип <b>No angle</b>. Списак тренутачно показуje само компаниje з вяликим потенциjалом без написаног угла.\n\n<i>AI разумeje все Словjанске jезыке. Или бар тврди да разумeje. Исто као и мы.</i>',
      btn: 'ГЛАСНО И JАСНО  →',
      hint: 'СОВЕТ: Брзи чипи покриваjу наjчешће упите',
    },
    compose: {
      title: '✉  КОМПОНИСТ MEESEEKS',
      sub: 'РАЗДЕЛ 5.2  //  FM-OA-2026',
      body: 'Кликни <b>✉ Compose</b> в навигациjи (горе десно). Отвара се Компонист Meeseeks.\n\nИзабери компаниjу → изабери контакт → изабери персону → кликни <b>✉ Генерисати Писмо</b>.\n\nТема + пун текст письма за ~3 секунде. Измени jeдну реченицу. Пошаljи. Узми хвалу.',
      btn: 'МИСИjА ЗАВРШЕНА  →',
      achievement: { name: 'ПРВИ КОНТАКТ', desc: 'Открил Компониста Meeseeks' },
    },
    gmail: {
      title: '📧  ПОВЕЗАТИ GMAIL',
      sub: 'РАЗДЕЛ 4.1  //  FM-OA-2026',
      body: 'Хаб може скенирати твоj Gmail:\n• Пронади постоjeће нити с компаниjама\n• Извади имена и емаjлове контаката\n• Покажи историjу односа\n\nОператори с повезаним Gmail-ом виде <b>3× више контактних података</b>. Тpaje 10 секунди.\n\n<i>Разузнавање без извора nije разузнавање — то je фолклор. Повежи Gmail.</i>',
      btn: '⚡ ПОВЕЗАТИ GMAIL',
      btnAlt: 'ПРЕСКОЧИТИ',
      achievement: { name: 'РАjДЕР САНДУЧЕТА', desc: 'Повезао Gmail за разузнавање односа' },
    },
    complete: {
      title: '🏆  ОПЕРАТОР СЕРТИФИКОВАН',
      sub: 'УЧЕЊЕ ЗАВРШЕНО  //  СВИ ЦИlьЕВИ ПОСТИГНУТИ',
      body: 'Сте сада одобрени за самосталне операциje.\n\n<b>Теренско Руководство FM-OA-2026</b> описуje сваку функциjу — проверите фолдер преузимања.\n\nИдите и нађите партнере за податке.\n\n<i>Срећно — или как се каже на свим Словjaнским jезицима одjeдном: Добро! Dobre! Добре! Dobro! Dober! Добра!</i>',
      btn: 'ПОВРАTAK У ЦЕНТАР  ⇒',
    },
  },

};
