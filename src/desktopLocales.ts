export type DesktopLocale='uk'|'pl'|'en'|'de'|'fr';

export const desktopLocales:DesktopLocale[]=['uk','pl','en','de','fr'];
export const desktopLocaleLabels:Record<DesktopLocale,string>={uk:'UA',pl:'PL',en:'EN',de:'DE',fr:'FR'};
export const desktopLocaleNames:Record<DesktopLocale,string>={uk:'Українська',pl:'Polski',en:'English',de:'Deutsch',fr:'Français'};

export const normalizeDesktopLocale=(value?:string|null):DesktopLocale=>{
 const v=String(value||'').toLowerCase();
 if(v.startsWith('uk')||v.startsWith('ua'))return 'uk';
 if(v.startsWith('pl'))return 'pl';
 if(v.startsWith('de'))return 'de';
 if(v.startsWith('fr'))return 'fr';
 return 'en';
};

type Dict=Record<string,string>;
const uk:Dict={
 'page.dashboard':'Dashboard','page.orders':'Замовлення','page.sales':'Sales','page.cars':'Автомобілі','page.clients':'Клієнти','page.calendar':'Календар','page.services':'Послуги','page.payments':'Оплати','page.broadcasts':'Розсилки','page.analytics':'Аналітика','page.reports':'Звіти','page.staff':'Персонал','page.audit':'Audit Log','page.workspace':'Layout Editor','page.settings':'Налаштування',
 'theme.light':'Світла','theme.dark':'Темна','logout':'Вийти','readonly':'Read Only: перегляд доступний, зміни заблоковані backend.',
 'blocked.title':'Desktop Control Center','blocked.phone':'Вхід з телефону заблокований.','blocked.device':'Відкрийте панель на PC, Mac, ноутбуці або iPad / планшеті.',
 'loading':'Завантаження робочого простору…','session.error':'Сесія недоступна.','session.hint':'Відкрийте Telegram Bot та надішліть команду /desktop, щоб отримати нове одноразове посилання.',
 'dashboard.new':'Нові заявки','dashboard.confirmed':'Підтверджені','dashboard.work':'Авто в роботі','dashboard.ready':'Готові','dashboard.unpaid':'Очікують оплату','dashboard.revenue':'Виручка сьогодні','dashboard.quick':'Швидкі дії','dashboard.system':'Система','quick.order':'Нова / активна заявка','quick.search':'Знайти замовлення','quick.cars':'Автомобілі','quick.schedule':'Розклад','quick.broadcasts':'Розсилки','quick.reports':'Звіти','system.role':'Роль',
 'orders.search':'Телефон, CHD-номер, @username, номер авто…','common.all':'Всі','common.refresh':'Оновити','orders.title':'Замовлення','orders.client':'Клієнт','orders.phone':'Телефон','orders.car':'Авто','orders.date':'Дата','orders.status':'Статус','orders.price':'Ціна','orders.payment':'Оплата',
 'services.search':'Пошук по всіх послугах та додаткових опціях…','services.total':'Всього','services.main':'Основні послуги','services.options':'Додаткові опції','services.sync':'Desktop показує той самий каталог, що й Bot Panel: основні послуги + усі додаткові опції калькулятора.','services.category':'Категорія','services.currency':'Валюта','services.duration':'Тривалість','services.state':'Стан','services.for':'Для послуг','services.pricing':'Тип ціни','services.unbound':'Усі / без привʼязки',
 'common.search':'Пошук','common.save':'Зберегти','common.close':'Закрити','common.language':'Мова','common.theme':'Тема'
};
const pl:Dict={
 'page.dashboard':'Dashboard','page.orders':'Zamówienia','page.sales':'Sales','page.cars':'Samochody','page.clients':'Klienci','page.calendar':'Kalendarz','page.services':'Usługi','page.payments':'Płatności','page.broadcasts':'Wysyłki','page.analytics':'Analityka','page.reports':'Raporty','page.staff':'Personel','page.audit':'Dziennik audytu','page.workspace':'Edytor układu','page.settings':'Ustawienia',
 'theme.light':'Jasny','theme.dark':'Ciemny','logout':'Wyloguj','readonly':'Tylko odczyt: podgląd jest dostępny, zmiany są zablokowane.',
 'blocked.title':'Desktop Control Center','blocked.phone':'Dostęp z telefonu jest zablokowany.','blocked.device':'Otwórz panel na PC, Mac, laptopie lub iPadzie / tablecie.',
 'loading':'Ładowanie przestrzeni roboczej…','session.error':'Sesja jest niedostępna.','session.hint':'Otwórz bota Telegram i wyślij /desktop, aby otrzymać nowy jednorazowy link.',
 'dashboard.new':'Nowe zlecenia','dashboard.confirmed':'Potwierdzone','dashboard.work':'Auta w pracy','dashboard.ready':'Gotowe','dashboard.unpaid':'Oczekują na płatność','dashboard.revenue':'Przychód dzisiaj','dashboard.quick':'Szybkie akcje','dashboard.system':'System','quick.order':'Nowe / aktywne zlecenie','quick.search':'Znajdź zamówienie','quick.cars':'Samochody','quick.schedule':'Harmonogram','quick.broadcasts':'Wysyłki','quick.reports':'Raporty','system.role':'Rola',
 'orders.search':'Telefon, numer CHD, @username, numer rejestracyjny…','common.all':'Wszystkie','common.refresh':'Odśwież','orders.title':'Zamówienia','orders.client':'Klient','orders.phone':'Telefon','orders.car':'Auto','orders.date':'Data','orders.status':'Status','orders.price':'Cena','orders.payment':'Płatność',
 'services.search':'Szukaj we wszystkich usługach i opcjach dodatkowych…','services.total':'Łącznie','services.main':'Usługi główne','services.options':'Opcje dodatkowe','services.sync':'Desktop pokazuje ten sam katalog co Bot Panel: usługi główne + wszystkie opcje kalkulatora.','services.category':'Kategoria','services.currency':'Waluta','services.duration':'Czas','services.state':'Status','services.for':'Dla usług','services.pricing':'Typ ceny','services.unbound':'Wszystkie / bez przypisania',
 'common.search':'Szukaj','common.save':'Zapisz','common.close':'Zamknij','common.language':'Język','common.theme':'Motyw'
};
const en:Dict={
 'page.dashboard':'Dashboard','page.orders':'Orders','page.sales':'Sales','page.cars':'Cars','page.clients':'Clients','page.calendar':'Calendar','page.services':'Services','page.payments':'Payments','page.broadcasts':'Broadcasts','page.analytics':'Analytics','page.reports':'Reports','page.staff':'Staff','page.audit':'Audit Log','page.workspace':'Layout Editor','page.settings':'Settings',
 'theme.light':'Light','theme.dark':'Dark','logout':'Log out','readonly':'Read Only: viewing is available, changes are blocked by the backend.',
 'blocked.title':'Desktop Control Center','blocked.phone':'Phone access is blocked.','blocked.device':'Open the panel on a PC, Mac, laptop or iPad / tablet.',
 'loading':'Loading workspace…','session.error':'Session is unavailable.','session.hint':'Open the Telegram Bot and send /desktop to get a new one-time link.',
 'dashboard.new':'New orders','dashboard.confirmed':'Confirmed','dashboard.work':'Cars in work','dashboard.ready':'Ready','dashboard.unpaid':'Awaiting payment','dashboard.revenue':'Revenue today','dashboard.quick':'Quick actions','dashboard.system':'System','quick.order':'New / active order','quick.search':'Find order','quick.cars':'Cars','quick.schedule':'Schedule','quick.broadcasts':'Broadcasts','quick.reports':'Reports','system.role':'Role',
 'orders.search':'Phone, CHD number, @username, license plate…','common.all':'All','common.refresh':'Refresh','orders.title':'Orders','orders.client':'Client','orders.phone':'Phone','orders.car':'Car','orders.date':'Date','orders.status':'Status','orders.price':'Price','orders.payment':'Payment',
 'services.search':'Search all services and add-on options…','services.total':'Total','services.main':'Main services','services.options':'Add-on options','services.sync':'Desktop shows the same catalog as Bot Panel: main services + all calculator options.','services.category':'Category','services.currency':'Currency','services.duration':'Duration','services.state':'Status','services.for':'For services','services.pricing':'Pricing type','services.unbound':'All / unassigned',
 'common.search':'Search','common.save':'Save','common.close':'Close','common.language':'Language','common.theme':'Theme'
};
const de:Dict={
 'page.dashboard':'Dashboard','page.orders':'Aufträge','page.sales':'Sales','page.cars':'Fahrzeuge','page.clients':'Kunden','page.calendar':'Kalender','page.services':'Leistungen','page.payments':'Zahlungen','page.broadcasts':'Nachrichten','page.analytics':'Analysen','page.reports':'Berichte','page.staff':'Personal','page.audit':'Audit-Protokoll','page.workspace':'Layout-Editor','page.settings':'Einstellungen',
 'theme.light':'Hell','theme.dark':'Dunkel','logout':'Abmelden','readonly':'Nur Lesen: Ansicht verfügbar, Änderungen sind serverseitig gesperrt.',
 'blocked.title':'Desktop Control Center','blocked.phone':'Der Zugriff per Smartphone ist gesperrt.','blocked.device':'Öffne das Panel auf PC, Mac, Laptop oder iPad / Tablet.',
 'loading':'Arbeitsbereich wird geladen…','session.error':'Sitzung nicht verfügbar.','session.hint':'Öffne den Telegram-Bot und sende /desktop, um einen neuen Einmal-Link zu erhalten.',
 'dashboard.new':'Neue Aufträge','dashboard.confirmed':'Bestätigt','dashboard.work':'Fahrzeuge in Arbeit','dashboard.ready':'Bereit','dashboard.unpaid':'Zahlung ausstehend','dashboard.revenue':'Umsatz heute','dashboard.quick':'Schnellaktionen','dashboard.system':'System','quick.order':'Neuer / aktiver Auftrag','quick.search':'Auftrag suchen','quick.cars':'Fahrzeuge','quick.schedule':'Zeitplan','quick.broadcasts':'Nachrichten','quick.reports':'Berichte','system.role':'Rolle',
 'orders.search':'Telefon, CHD-Nummer, @username, Kennzeichen…','common.all':'Alle','common.refresh':'Aktualisieren','orders.title':'Aufträge','orders.client':'Kunde','orders.phone':'Telefon','orders.car':'Fahrzeug','orders.date':'Datum','orders.status':'Status','orders.price':'Preis','orders.payment':'Zahlung',
 'services.search':'Alle Leistungen und Zusatzoptionen durchsuchen…','services.total':'Gesamt','services.main':'Hauptleistungen','services.options':'Zusatzoptionen','services.sync':'Desktop zeigt denselben Katalog wie das Bot Panel: Hauptleistungen + alle Kalkulatoroptionen.','services.category':'Kategorie','services.currency':'Währung','services.duration':'Dauer','services.state':'Status','services.for':'Für Leistungen','services.pricing':'Preistyp','services.unbound':'Alle / nicht zugeordnet',
 'common.search':'Suchen','common.save':'Speichern','common.close':'Schließen','common.language':'Sprache','common.theme':'Design'
};
const fr:Dict={
 'page.dashboard':'Dashboard','page.orders':'Commandes','page.sales':'Sales','page.cars':'Véhicules','page.clients':'Clients','page.calendar':'Calendrier','page.services':'Services','page.payments':'Paiements','page.broadcasts':'Diffusions','page.analytics':'Analytique','page.reports':'Rapports','page.staff':'Personnel','page.audit':'Journal d’audit','page.workspace':'Éditeur de mise en page','page.settings':'Paramètres',
 'theme.light':'Clair','theme.dark':'Sombre','logout':'Déconnexion','readonly':'Lecture seule : consultation disponible, modifications bloquées côté serveur.',
 'blocked.title':'Desktop Control Center','blocked.phone':'L’accès depuis un téléphone est bloqué.','blocked.device':'Ouvrez le panneau sur PC, Mac, ordinateur portable ou iPad / tablette.',
 'loading':'Chargement de l’espace de travail…','session.error':'Session indisponible.','session.hint':'Ouvrez le bot Telegram et envoyez /desktop pour obtenir un nouveau lien à usage unique.',
 'dashboard.new':'Nouvelles commandes','dashboard.confirmed':'Confirmées','dashboard.work':'Véhicules en cours','dashboard.ready':'Prêts','dashboard.unpaid':'En attente de paiement','dashboard.revenue':'Revenu aujourd’hui','dashboard.quick':'Actions rapides','dashboard.system':'Système','quick.order':'Nouvelle / active','quick.search':'Trouver une commande','quick.cars':'Véhicules','quick.schedule':'Planning','quick.broadcasts':'Diffusions','quick.reports':'Rapports','system.role':'Rôle',
 'orders.search':'Téléphone, numéro CHD, @username, immatriculation…','common.all':'Tous','common.refresh':'Actualiser','orders.title':'Commandes','orders.client':'Client','orders.phone':'Téléphone','orders.car':'Véhicule','orders.date':'Date','orders.status':'Statut','orders.price':'Prix','orders.payment':'Paiement',
 'services.search':'Rechercher dans tous les services et options…','services.total':'Total','services.main':'Services principaux','services.options':'Options supplémentaires','services.sync':'Desktop affiche le même catalogue que le Bot Panel : services principaux + toutes les options du calculateur.','services.category':'Catégorie','services.currency':'Devise','services.duration':'Durée','services.state':'Statut','services.for':'Pour les services','services.pricing':'Type de prix','services.unbound':'Tous / non attribués',
 'common.search':'Rechercher','common.save':'Enregistrer','common.close':'Fermer','common.language':'Langue','common.theme':'Thème'
};
const dictionaries:Record<DesktopLocale,Dict>={uk,pl,en,de,fr};
export const desktopT=(locale:DesktopLocale,key:string)=>dictionaries[locale]?.[key]??en[key]??key;
