(() => {
  'use strict';
  const seed = window.VydajeData;
  const APP_KEY = 'vydaje-app-v2';
  const SOURCE_KEY = 'vydaje-app-v1'; // původní aplikace; pouze se z ní čte
  const cloud = location.protocol.startsWith('http') ? window.VydajeCloud || null : null;
  let storageKey = APP_KEY;
  // Stav účtu musí existovat dřív, než se poprvé zavolá save().
  let session = null, pushTimer = null, pushing = false, pushAgain = false, syncState = 'saved', authMode = 'in', accountDeleting = false;
  const money = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' });
  const compact = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 });
  const dateShort = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const dayMonth = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' });
  const dateTiny = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' });
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('cs').replace(/[^a-z0-9]+/g, ' ').trim();
  const iconNames = ['vše', 'jídlo', 'restaurace', 'kafe', 'pití', 'benzín', 'parkování', 'auto', 'doprava', 'kolo', 'cestování', 'cesta', 'předplatné', 'zábava', 'hry', 'hudba', 'film', 'knihy', 'nákup', 'oblečení', 'elektronika', 'počítač', 'telefon', 'drogerie', 'kadeřník', 'zdraví', 'sport', 'domov', 'domácnost', 'bydlení', 'energie', 'nářadí', 'zahrada', 'kočka', 'pes', 'děti', 'rodina', 'osoba', 'srdce', 'dárek', 'vzdělání', 'práce', 'investice', 'odvody', 'pojištění', 'účty', 'karta', 'převod', 'ostatní'];
  const iconPaths = {
    'vše': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    'jídlo': '<circle cx="12" cy="12" r="6"/><path d="M3 3v7m2-7v7m-2 0h2m0 0v11M20 3v18m0-18c-3 2-3 7 0 8"/>',
    'benzín': '<rect x="3" y="5" width="11" height="16" rx="1"/><path d="M5 9h7M14 8h2l3 3v7a2 2 0 0 0 4 0v-6l-2-2M5 21h12"/>',
    'parkování': '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
    'předplatné': '<path d="M20 8a8 8 0 0 0-14-2L4 8m0-5v5h5M4 16a8 8 0 0 0 14 2l2-2m0 5v-5h-5"/>',
    'zábava': '<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7ZM12 7v10"/>',
    'nákup': '<path d="M5 8h14l-1 13H6L5 8ZM9 9V6a3 3 0 0 1 6 0v3"/>',
    'převod': '<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
    'elektronika': '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>',
    'auto': '<path d="m5 14 2-7h10l2 7M4 14h16v5H4v-5ZM6 19v2m12-2v2M7 10h10M7 16h1m8 0h1"/>',
    'drogerie': '<path d="M9 3h6v3H9zM8 6h8l2 4v11H6V10l2-4ZM9 14h6"/>',
    'ostatní': '<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>',
    'kočka': '<path d="M4 9 5 3l5 3h4l5-3 1 6v6a8 8 0 0 1-16 0V9ZM9 13h.01M15 13h.01m-5 4 2 1 2-1M3 16l4 1m14-1-4 1"/>',
    'domov': '<path d="m3 11 9-8 9 8v10H3V11ZM9 21v-7h6v7"/>',
    'zdraví': '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
    'cesta': '<path d="m3 12 18-7-6 16-3-7-9-2Zm9 2 4-5"/>',
    'oblečení': '<path d="m8 3-5 4 3 4 2-2v12h8V9l2 2 3-4-5-4-2 2h-4L8 3Z"/>',
    'sport': '<path d="M3 9v6m3-9v12m3-9v6m6-6v6m3-9v12m3-9v6M9 12h6"/>',
    'dárek': '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M2 9h20M12 9v12M12 9C8 9 6 8 6 6a2 2 0 0 1 4 0l2 3Zm0 0c4 0 6-1 6-3a2 2 0 0 0-4 0l-2 3Z"/>',
    'práce': '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V4h6v3M3 13h18M10 13v2h4v-2"/>',
    'restaurace': '<path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3Zm0 0v7"/>',
    'kafe': '<path d="M10 2v2m4-2v2M6 2v2m10 4a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
    'pití': '<path d="M8 22h8M7 10h10M12 15v7m0-7a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/>',
    'doprava': '<rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 6 2 7m20 0-2-1M10 6h4M4 11h16M8 15h.01M16 15h.01M6 19v2m12 0v-2"/>',
    'kolo': '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
    'cestování': '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"/>',
    'hry': '<path d="M6 11h4M8 9v4m7-1h.01M18 10h.01M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.55-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5Z"/>',
    'hudba': '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    'film': '<rect x="2" y="7" width="20" height="15" rx="2"/><path d="m17 2-5 5-5-5"/>',
    'knihy': '<path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3H3Z"/>',
    'počítač': '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    'telefon': '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    'kadeřník': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.12 8.12 12 12m8-8L8.12 15.88M14.8 14.8 20 20"/>',
    'domácnost': '<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0v5Zm2 2v2m16-2v2"/>',
    'bydlení': '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18H6ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2m12-13h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4m-4 4h4m-4 4h4m-4 4h4"/>',
    'energie': '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    'nářadí': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1c.32-.32.86-.22.98.22a6 6 0 0 1-8.26 7.06l-7.91 7.91a2.12 2.12 0 0 1-3-3l7.91-7.91a6 6 0 0 1 7.06-8.26c.44.12.54.66.22.98L14.7 6.3Z"/>',
    'zahrada': '<path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8ZM14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2Z"/>',
    'pes': '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10H9Z"/>',
    'děti': '<path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5S14.6 8 13.5 8c-.8 0-1.5-.4-1.5-1"/>',
    'rodina': '<circle cx="9" cy="7" r="4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    'osoba': '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    'srdce': '<path d="M12 21 4 13a5 5 0 0 1 7-7l1 1 1-1a5 5 0 0 1 7 7l-8 8Z"/>',
    'vzdělání': '<path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0l8.59-3.9ZM22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    'investice': '<path d="M22 7 13.5 15.5l-5-5L2 17"/><path d="M16 7h6v6"/>',
    'odvody': '<path d="M3 22h18M6 18v-7m4 7v-7m4 7v-7m4 7v-7M12 2l8 5H4l8-5Z"/>',
    'pojištění': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7Z"/>',
    'účty': '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1ZM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8m4 1.5v-11"/>',
    'karta': '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    'upravit': '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"/>',
    'smazat': '<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m5 4v7m4-7v7"/>'
  };
  const defaultIcons = { 'Jídlo': 'jídlo', 'Benzín': 'benzín', 'Parkování': 'parkování', 'Předplatné': 'předplatné', 'Zábava': 'zábava', 'Rozmar': 'nákup', 'Nepočítá se': 'převod', 'Elektronika': 'elektronika', 'Auto': 'auto', 'Drogerie': 'drogerie', 'Nezařazeno': 'ostatní', 'Kočka': 'kočka', 'Domácnost': 'domácnost', 'Bydlení': 'bydlení', 'Odvody': 'odvody', 'Investice': 'investice', 'Hry': 'hry', 'Doprava': 'doprava', 'Miky': 'osoba', 'Cestování': 'cestování', 'Rodina': 'rodina', 'Patrice': 'srdce' };
  // Kategorie, které uživatel 20. 11. 2026 chtěl mít vždy k dispozici.
  const addedCategories = ['Hry', 'Doprava', 'Cestování', 'Miky', 'Rodina'];
  // Jednorázové přeznačení ikon u kategorií se stejným názvem (bez diakritiky a velikosti písmen).
  const renamedIcons = { odvody: 'odvody', investice: 'investice', bydleni: 'bydlení', domacnost: 'domácnost', patrice: 'srdce', hry: 'hry', doprava: 'doprava', miky: 'osoba', cestovani: 'cestování', rodina: 'rodina' };
  const logoRules = [
    [/apple/, 'apple'], [/alza/, 'alza'], [/albert/, 'albert'], [/billa/, 'billa'],
    [/^ono |tank ono/, 'ono'], [/aluha/, 'aluha'], [/rohlik/, 'rohlik'],
    [/playlive/, 'playlive'], [/pidlitacka/, 'pid'], [/wolt/, 'wolt'],
    [/openai|chatgpt/, 'openai'], [/kaufland/, 'kaufland'], [/^action/, 'action'],
    [/globus/, 'globus'], [/^dm /, 'dm'], [/adobe/, 'adobe'],
    [/anthropic|claude/, 'anthropic'], [/rossmann/, 'rossmann'], [/eurooil/, 'eurooil'],
    [/u tenisu/, 'utenisu'], [/^bb cestlice|bageterie boulevard/, 'bb'], [/sunny market/, 'sunny'],
    // Sbírka log ze 17. 11. 2026 (zdroje v docs/loga-zdroje.json); vzor platí od začátku slova.
    [/(?:^| )(?:tesco)/, 'tesco'],
    [/(?:^| )(?:norma)/, 'norma'],
    [/(?:^| )mol(?: |$)/, 'mol'],
    [/(?:^| )(?:netflix)/, 'netflix'],
    [/(?:^| )(?:spotify)/, 'spotify'],
    [/(?:^| )(?:dr max|drmax)/, 'drmax'],
    [/(?:^| )(?:ppl)/, 'ppl'],
    [/(?:^| )(?:burger king|burgerking)/, 'burgerking'],
    [/(?:^| )(?:mall cz|allegro)/, 'mall'],
    [/(?:^| )(?:youtube)/, 'youtube'],
    [/(?:^| )(?:lidl)/, 'lidl'],
    [/(?:^| )(?:makro)/, 'makro'],
    [/(?:^| )(?:coop jednota|jednota|coop)/, 'coop'],
    [/(?:^| )(?:kosik)/, 'kosik'],
    [/(?:^| )(?:teta drogerie)/, 'teta'],
    [/(?:^| )(?:benu)/, 'benu'],
    [/(?:^| )(?:pilulka)/, 'pilulka'],
    [/(?:^| )(?:notino)/, 'notino'],
    [/(?:^| )(?:orlen|benzina)/, 'orlen'],
    [/(?:^| )(?:shell)/, 'shell'],
    [/(?:^| )(?:omv)/, 'omv'],
    [/(?:^| )(?:mcdonald)/, 'mcdonalds'],
    [/(?:^| )(?:kfc)/, 'kfc'],
    [/(?:^| )(?:starbucks)/, 'starbucks'],
    [/(?:^| )(?:costa coffee)/, 'costa'],
    [/(?:^| )(?:ikea)/, 'ikea'],
    [/(?:^| )(?:decathlon)/, 'decathlon'],
    [/(?:^| )(?:hornbach)/, 'hornbach'],
    [/(?:^| )(?:obi market|obi cz)/, 'obi'],
    [/(?:^| )(?:bauhaus)/, 'bauhaus'],
    [/(?:^| )(?:czc)/, 'czc'],
    [/(?:^| )(?:pepco)/, 'pepco'],
    [/(?:^| )(?:tedi)/, 'tedi'],
    [/(?:^| )(?:zara)/, 'zara'],
    [/(?:^| )(?:lindex)/, 'lindex'],
    [/(?:^| )(?:bolt)/, 'bolt'],
    [/(?:^| )(?:uber)/, 'uber'],
    [/(?:^| )(?:foodora)/, 'foodora'],
    [/(?:^| )(?:ceske drahy|cd cz)/, 'cd'],
    [/(?:^| )(?:regiojet)/, 'regiojet'],
    [/(?:^| )(?:leo express|leoexpress)/, 'leoexpress'],
    [/(?:^| )(?:google)/, 'google'],
    [/(?:^| )(?:steam)/, 'steam'],
    [/(?:^| )(?:microsoft)/, 'microsoft'],
    [/(?:^| )o2(?: |$)/, 'o2'],
    [/(?:^| )(?:t mobile|tmobile)/, 'tmobile'],
    [/(?:^| )(?:vodafone)/, 'vodafone'],
    [/(?:^| )(?:cez)/, 'cez'],
    [/(?:^| )(?:packeta|zasilkovna)/, 'packeta'],
    [/(?:^| )(?:douglas)/, 'douglas'],
    [/(?:^| )(?:yves rocher)/, 'yverocher'],
    [/(?:^| )(?:kiko)/, 'kiko'],
    [/(?:^| )(?:deichmann)/, 'deichmann'],
    [/(?:^| )(?:nike)/, 'nike'],
    [/(?:^| )(?:adidas)/, 'adidas'],
    [/(?:^| )(?:sportisimo)/, 'sportisimo'],
    [/(?:^| )(?:ryanair)/, 'ryanair'],
    [/(?:^| )(?:wizz air|wizzair)/, 'wizzair'],
    [/(?:^| )(?:booking com|booking)/, 'booking'],
    [/(?:^| )(?:airbnb)/, 'airbnb'],
    [/(?:^| )(?:aliexpress)/, 'aliexpress'],
    [/(?:^| )(?:temu)/, 'temu'],
    [/(?:^| )(?:shein)/, 'shein'],
    [/(?:^| )(?:playstation)/, 'playstation'],
    [/(?:^| )(?:disney plus|disney)/, 'disneyplus'],
    [/(?:^| )(?:xbox)/, 'xbox'],
    [/(?:^| )(?:github)/, 'github'],
    [/(?:^| )(?:canva)/, 'canva'],
    [/(?:^| )(?:notion)/, 'notion'],
    [/(?:^| )(?:figma)/, 'figma'],
    [/(?:^| )(?:duolingo)/, 'duolingo'],
    [/(?:^| )(?:revolut)/, 'revolut'],
    [/(?:^| )(?:ceska sporitelna|csas)/, 'csas'],
    [/(?:^| )(?:komercni banka)/, 'kb'],
    [/(?:^| )(?:csob)/, 'csob'],
    [/(?:^| )(?:fio banka)/, 'fio'],
    [/(?:^| )(?:mbank)/, 'mbank'],
    [/(?:^| )(?:hbo max|hbomax)/, 'hbomax'],
    [/(?:^| )(?:lego)/, 'lego'],
    [/(?:^| )(?:tchibo)/, 'tchibo'],
    [/(?:^| )(?:sbazar)/, 'sbazar'],
    [/(?:^| )(?:bazos)/, 'bazos'],
    [/(?:^| )(?:ticketportal)/, 'ticketportal'],
    [/(?:^| )(?:dpp)/, 'dpp'],
    // Doplněno 20. 11. 2026 (ikony aplikací z App Store a oficiální favicony, viz docs/loga-zdroje.json).
    [/(?:^| )dpmb/, 'dpmb'],
    [/(?:^| )(?:eon|e on)(?: |$)/, 'eon'],
    [/(?:^| )flix ?bus/, 'flixbus'],
    [/(?:^| )liftago/, 'liftago'],
    [/(?:^| )discord/, 'discord'],
    [/(?:^| )twitch/, 'twitch'],
    [/(?:^| )gog com|(?:^| )gog(?: |$)/, 'gog'],
    [/(?:^| )instant gaming/, 'instantgaming'],
    [/(?:^| )nintendo/, 'nintendo'],
    [/(?:^| )skoda auto|(?:^| )myskoda/, 'skoda']
  ];
  const logoNames = { apple:'Apple', alza:'Alza', albert:'Albert', billa:'BILLA', ono:'Tank ONO', aluha:'Aluha', rohlik:'Rohlík', playlive:'PlayLive', pid:'PID Lítačka', wolt:'Wolt', openai:'OpenAI', kaufland:'Kaufland', action:'Action', globus:'Globus', dm:'dm', adobe:'Adobe', anthropic:'Claude (Anthropic)', rossmann:'Rossmann', eurooil:'EuroOil', utenisu:'U Tenisu', bb:'Bageterie Boulevard', sunny:'Sunny Market', tesco:'Tesco', norma:'Norma', mol:'MOL', netflix:'Netflix', spotify:'Spotify', drmax:'Dr.Max', ppl:'PPL', burgerking:'Burger King', mall:'Allegro (Mall)', youtube:'YouTube', lidl:'Lidl', makro:'Makro', coop:'COOP Jednota', kosik:'Košík', teta:'Teta', benu:'Benu', pilulka:'Pilulka', notino:'Notino', orlen:'Orlen', shell:'Shell', omv:'OMV', mcdonalds:'McDonald\'s', kfc:'KFC', starbucks:'Starbucks', costa:'Costa Coffee', ikea:'IKEA', decathlon:'Decathlon', hornbach:'Hornbach', obi:'OBI', bauhaus:'Bauhaus', czc:'CZC', pepco:'Pepco', tedi:'TEDi', zara:'Zara', lindex:'Lindex', bolt:'Bolt', uber:'Uber', foodora:'Foodora', cd:'České dráhy', regiojet:'RegioJet', leoexpress:'Leo Express', google:'Google', steam:'Steam', microsoft:'Microsoft', o2:'O2', tmobile:'T-Mobile', vodafone:'Vodafone', cez:'ČEZ', packeta:'Zásilkovna (Packeta)', douglas:'Douglas', yverocher:'Yves Rocher', kiko:'KIKO', deichmann:'Deichmann', nike:'Nike', adidas:'adidas', sportisimo:'Sportisimo', ryanair:'Ryanair', wizzair:'Wizz Air', booking:'Booking.com', airbnb:'Airbnb', aliexpress:'AliExpress', temu:'Temu', shein:'SHEIN', playstation:'PlayStation', disneyplus:'Disney+', xbox:'Xbox', github:'GitHub', canva:'Canva', notion:'Notion', figma:'Figma', duolingo:'Duolingo', revolut:'Revolut', csas:'Česká spořitelna', kb:'Komerční banka', csob:'ČSOB', fio:'Fio banka', mbank:'mBank', hbomax:'HBO Max', lego:'LEGO', tchibo:'Tchibo', sbazar:'Sbazar', bazos:'Bazoš', ticketportal:'Ticketportal', dpp:'DPP', dpmb:'DPMB', eon:'E.ON', flixbus:'FlixBus', liftago:'Liftago', discord:'Discord', twitch:'Twitch', gog:'GOG', instantgaming:'Instant Gaming', nintendo:'Nintendo', skoda:'Škoda' };
  // Loga, která jsou sama čtvercovou dlaždicí s barevným pozadím: vyplní celou dlaždici, jinak by uvnitř bílé dlaždice byl vidět ostrý čtverec.
  const tileLogos = new Set(['adobe', 'bb', 'billa', 'pid', 'playlive', 'sunny', 'wolt', 'eurooil', 'norma', 'spotify', 'drmax', 'airbnb', 'bolt', 'canva', 'cd', 'cez', 'decathlon', 'deichmann', 'disneyplus', 'figma', 'foodora', 'hbomax', 'hornbach', 'kb', 'kfc', 'kiko', 'lego', 'leoexpress', 'lidl', 'makro', 'microsoft', 'orlen', 'regiojet', 'ryanair', 'shein', 'shell', 'sportisimo', 'starbucks', 'temu', 'tmobile', 'wizzair', 'yverocher', 'action', 'anthropic', 'burgerking', 'discord', 'dpmb', 'liftago', 'mall', 'netflix', 'o2', 'openai', 'ppl', 'rohlik', 'skoda', 'twitch', 'youtube', 'flixbus', 'instantgaming', 'nintendo']);
  function logoImg(id, lazy = false) { return `<img src="${logoPath(id)}" alt=""${tileLogos.has(id) ? ' class="tile"' : ''}${lazy ? ' loading="lazy"' : ''}>`; }
  function logoPath(id) { return `assets/logos/${id}.png`; }
  const ui = {
    close: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', chevron: '<path d="m7 10 5 5 5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', right: '<path d="m9.5 6 6 6-6 6"/>', left: '<path d="m14.5 6-6 6 6 6"/>', down: '<path d="M12 5v14m-6-6 6 6 6-6"/>',
    up: '<path d="M12 19V5m-6 6 6-6 6 6"/>', same: '<path d="M5 9h14M5 15h14"/>', swap: '<path d="M7 4 3.5 7.5 7 11M3.5 7.5h13M17 13l3.5 3.5L17 20m3.5-3.5h-13"/>', filter: '<path d="M4 6h16M7 12h10M10 18h4"/>', target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 1.5v3m0 15v3m10.5-10.5h-3m-15 0h-3"/>'
  };
  function uiIcon(name, className = '') { return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${ui[name]}</svg>`; }
  // Každá kategorie má jednu stálou barvu ve všech grafech.
  const categoryColors = { 'Jídlo': '#F76707', 'Benzín': '#2F6BFF', 'Parkování': '#4DABF7', 'Předplatné': '#7950F2', 'Zábava': '#E64980', 'Rozmar': '#F2B705', 'Elektronika': '#12B886', 'Auto': '#1098AD', 'Drogerie': '#C2255C', 'Nezařazeno': '#868E96', 'Nepočítá se': '#CED4DA', 'Kočka': '#A9743A', 'Domácnost': '#82C91E', 'Hry': '#5C7CFA', 'Doprava': '#1C7ED6', 'Cestování': '#15AABF', 'Miky': '#0CA678', 'Rodina': '#E8590C', 'Bydlení': '#D9480F', 'Odvody': '#868E3A', 'Investice': '#2B8A3E', 'Patrice': '#E03174' };
  const extraColors = ['#0CA678', '#D9480F', '#5F3DC4', '#74B816', '#C92A2A', '#1971C2', '#E8590C', '#9C36B5'];
  function catColor(name) {
    if (categoryColors[name]) return categoryColors[name];
    if (name === 'Ostatní') return '#ADB5BD';
    let hash = 0; for (const char of String(name)) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    return extraColors[hash % extraColors.length];
  }
  const wallpapers = [
    { id: 'kobalt', name: 'Kobalt', color: '#0C2FBE' },
    { id: 'smaragd', name: 'Smaragd', color: '#0B6B35' },
    { id: 'bordo', name: 'Bordó', color: '#3A1013' },
    { id: 'grafit', name: 'Grafit', color: '#2A2A2C' },
    { id: 'safran', name: 'Šafrán', color: '#F1A905' },
    { id: 'levandule', name: 'Levandule', color: '#C0A0DC' },
    { id: 'petrolej', name: 'Petrolej', color: '#063A3F' },
    { id: 'koral', name: 'Korál', color: '#F7767B' },
    { id: 'svestka', name: 'Švestka', color: '#471E33' },
    { id: 'oliva', name: 'Oliva', color: '#576C24' },
    { id: 'pisek', name: 'Písek', color: '#CDAB80' },
    { id: 'terakota', name: 'Terakota', color: '#D15A24' },
    { id: 'mentol', name: 'Mentol', color: '#96E6AF' },
    { id: 'fuchsie', name: 'Fuchsie', color: '#DB0C68' },
    { id: 'noc', name: 'Noc', color: '#0E1E3C' },
    { id: 'rubin', name: 'Rubín', color: '#8E0D1B' },
    { id: 'ledovec', name: 'Ledovec', color: '#B5D1DC' },
    { id: 'jantar', name: 'Jantar', color: '#E97A0F' },
    { id: 'antracit', name: 'Antracit', color: '#40493F' },
    { id: 'broskev', name: 'Broskev', color: '#F9B799' },
    { id: 'indigo', name: 'Indigo', color: '#233381' },
    { id: 'salvej', name: 'Šalvěj', color: '#899574' },
    { id: 'horcice', name: 'Hořčice', color: '#D49417' },
    { id: 'ruze', name: 'Růže', color: '#D88789' },
    { id: 'kakao', name: 'Kakao', color: '#652F23' },
    { id: 'tyrkys', name: 'Tyrkys', color: '#17D1CF' },
    { id: 'slonovina', name: 'Slonovina', color: '#EFE2CF' },
    { id: 'vino', name: 'Víno', color: '#620E23' },
    { id: 'citron', name: 'Citron', color: '#F7DB11' }
  ];
  const monthLocative = ['lednu', 'únoru', 'březnu', 'dubnu', 'květnu', 'červnu', 'červenci', 'srpnu', 'září', 'říjnu', 'listopadu', 'prosinci'];
  const monthFormat = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' });
  const monthShort = new Intl.DateTimeFormat('cs-CZ', { month: 'short' });
  const dayLong = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' });
  const wholeCrowns = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });
  function icon(name, className = '') {
    return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.ostatní}</svg>`;
  }
  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }
  function initialState() {
    const legacy = readJson(seed.storageKey) || {};
    const names = [...new Set([...seed.baseCategories, ...(Array.isArray(legacy.categories) ? legacy.categories : [])])];
    const transactions = seed.transactions.map(row => ({ id: `legacy-${row.id}`, date: row.date, description: row.description, cents: row.amount, category: legacy.assignments?.[row.id] || row.category, note: legacy.notes?.[row.id] || '', source: 'počáteční import' }));
    return { version: 1, transactions, categories: names.map(name => ({ name, icon: defaultIcons[name] || 'ostatní' })), brandOverrides: {} };
  }
  function validState(value) {
    return value && (value.version === 1 || value.version === 2) && Array.isArray(value.transactions) && Array.isArray(value.categories) && value.brandOverrides && typeof value.brandOverrides === 'object';
  }
  let categoryMigrated = false;
  // Verze 2 přidává měsíční limit (budgetCents) a tapetu (wallpaper).
  function migrate(value) {
    value.version = 2;
    if (!Number.isInteger(value.budgetCents) || value.budgetCents <= 0) value.budgetCents = null;
    if (!wallpapers.some(item => item.id === value.wallpaper)) value.wallpaper = 'bordo';
    // categorySet 1 (20. 11. 2026): nové ikony u známých názvů a kategorie Hry, Doprava, Cestování, Miky, Rodina.
    if (value.categorySet !== 1 && Array.isArray(value.categories)) {
      value.categories.forEach(item => { const next = renamedIcons[normalize(item.name)]; if (next) item.icon = next; });
      addedCategories.forEach(name => { if (!value.categories.some(item => normalize(item.name) === normalize(name))) value.categories.push({ name, icon: defaultIcons[name] }); });
      value.categorySet = 1;
      categoryMigrated = true;
    }
    if (!value.categoryBudgets || typeof value.categoryBudgets !== 'object' || Array.isArray(value.categoryBudgets)) value.categoryBudgets = {};
    Object.keys(value.categoryBudgets).forEach(name => { if (!Number.isInteger(value.categoryBudgets[name]) || value.categoryBudgets[name] <= 0) delete value.categoryBudgets[name]; });
    return value;
  }
  let data = cloud ? migrate({ version: 2, transactions: [], categories: [], brandOverrides: {} }) : migrate(validState(readJson(APP_KEY)) ? readJson(APP_KEY) : validState(readJson(SOURCE_KEY)) ? readJson(SOURCE_KEY) : initialState());
  function save() {
    data.updatedAt = Date.now();
    let stored = true;
    try { localStorage.setItem(storageKey, JSON.stringify(data)); }
    catch { stored = false; if (!session) toast('Úložiště prohlížeče je plné. Stáhni si zálohu dat.'); }
    if (session) schedulePush();
    return stored;
  }
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  let selectedMonth = currentMonth;
  let periodBeforeRange = selectedMonth;
  let filters = { search: '', from: '', to: '', min: '', max: '', category: '', counting: 'all', sort: 'newest' };
  let addTab = 'manual';
  let draftCategory = 'Nezařazeno';
  let draftIcon = 'ostatní';
  let importPreview = [];
  let importRaw = '';
  let importSkippedIncome = 0;
  let categoryTarget = null;
  let iconTarget = null;
  let editTarget = null;
  let logoTarget = null;
  let toastTimer;
  let budgetEditing = false;
  let filtersOpen = false;

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }
  if (!cloud && !readJson(APP_KEY)) save();
  function category(name) { return data.categories.find(item => item.name === name) || data.categories.find(item => item.name === 'Nezařazeno'); }
  function categoryIcon(name, className = '') { return icon(category(name)?.icon || 'ostatní', className); }
  function categoryName(row) { return category(row.category) ? row.category : 'Nezařazeno'; }
  function merchantKey(description) { return normalize(description); }
  function logoId(description) { return logoRules.find(([rule]) => rule.test(merchantKey(description)))?.[1] || null; }
  function logoMarkup(row) {
    const custom = data.brandOverrides[merchantKey(row.description)];
    const known = logoId(row.description);
    const src = custom || (known ? logoPath(known) : '');
    return `<span class="brand-logo" aria-hidden="true">${src ? `<img src="${escapeHtml(src)}" alt=""${!custom && tileLogos.has(known) ? ' class="tile"' : ''}>` : categoryIcon(categoryName(row))}</span>`;
  }
  function dateObject(iso) { return new Date(`${iso}T12:00:00Z`); }
  function displayDate(iso) { return dateShort.format(dateObject(iso)); }
  function moneyCents(cents) { return money.format(cents / 100); }
  function positiveMoney(cents) { return money.format(Math.abs(cents) / 100); }
  function parseCents(value) {
    const cleaned = String(value || '').replace(/[\u00a0\u2009\u202f\s]|Kč|CZK/gi, '').replace(',', '.').replace(/^−/, '-');
    if (!/^-?\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
    return Math.round(Math.abs(Number(cleaned)) * 100);
  }
  function monthLabel(key) {
    if (!key) return 'Všechna období';
    const [year, month] = key.split('-').map(Number);
    const label = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
    return label[0].toLocaleUpperCase('cs') + label.slice(1);
  }
  function shiftMonth(delta) {
    const key = selectedMonth || currentMonth;
    const [year, month] = key.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    selectedMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    periodBeforeRange = selectedMonth;
    filters.from = '';
    filters.to = '';
    animateNext = true;
    render();
  }
  function baseRows() {
    return data.transactions.filter(row => {
      if (selectedMonth && !filters.from && !filters.to && !row.date.startsWith(selectedMonth)) return false;
      if (filters.from && row.date < filters.from) return false;
      if (filters.to && row.date > filters.to) return false;
      return true;
    });
  }
  function applyFilters(rows) {
    const min = parseCents(filters.min);
    const max = parseCents(filters.max);
    const q = normalize(filters.search);
    return rows.filter(row => {
      if (filters.category && categoryName(row) !== filters.category) return false;
      if (filters.counting === 'counted' && categoryName(row) === 'Nepočítá se') return false;
      if (filters.counting === 'excluded' && categoryName(row) !== 'Nepočítá se') return false;
      const abs = Math.abs(row.cents);
      if (filters.min && min !== null && abs < min) return false;
      if (filters.max && max !== null && abs > max) return false;
      if (q && !normalize(`${row.description} ${row.note}`).includes(q)) return false;
      return true;
    });
  }
  function filteredRows() {
    return applyFilters(baseRows()).sort((a, b) => filters.sort === 'highest' ? (a.cents - b.cents || b.date.localeCompare(a.date)) : filters.sort === 'oldest' ? (a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id))) : (b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))));
  }
  function hasContentFilter() { return !!(filters.search || filters.min || filters.max || filters.category || filters.counting !== 'all'); }
  function resetFilters() { filters = { search: '', from: '', to: '', min: '', max: '', category: '', counting: 'all', sort: 'newest' }; }
  function countedRows(rows) { return rows.filter(row => categoryName(row) !== 'Nepočítá se'); }
  function totalsByCategory(rows) {
    const map = new Map();
    countedRows(rows).forEach(row => map.set(categoryName(row), (map.get(categoryName(row)) || 0) - row.cents));
    return [...map].sort((a, b) => b[1] - a[1]);
  }
  function sumCents(rows) { return 0 - countedRows(rows).reduce((sum, row) => sum + row.cents, 0); }
  function rangeDescription() {
    if (filters.from && filters.from === filters.to) return displayDate(filters.from);
    // Ve stejném roce se rok píše jen jednou, aby se období vešlo do kapsle i na mobilu.
    if (filters.from && filters.to && filters.from.slice(0, 4) === filters.to.slice(0, 4)) return `${dayMonth.format(dateObject(filters.from))} – ${filters.to.startsWith(String(today.getFullYear())) ? dayMonth.format(dateObject(filters.to)) : displayDate(filters.to)}`;
    if (filters.from || filters.to) return [filters.from ? displayDate(filters.from) : 'bez začátku', filters.to ? displayDate(filters.to) : 'bez konce'].join(' – ');
    return selectedMonth ? monthLabel(selectedMonth) : 'Všechna období';
  }
  function route() {
    const name = location.hash.match(/^#\/(overview|transactions|analysis|compare|add|limits|categories)/)?.[1];
    return name || 'overview';
  }
  function applyWallpaper() {
    const item = wallpapers.find(entry => entry.id === data.wallpaper) || wallpapers[0];
    document.documentElement.dataset.wallpaper = item.id;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', item.color);
  }
  function currentWallpaper() { return wallpapers.find(entry => entry.id === data.wallpaper) || wallpapers[0]; }
  function wallpaperButtons(withNames = false) {
    return wallpapers.map(item => `<button type="button" class="wallpaper-swatch" role="radio" aria-checked="${data.wallpaper === item.id}" data-action="set-wallpaper" data-value="${item.id}" style="background-image:url(assets/bg/${item.id}-nahled.webp)" ${withNames ? '' : `aria-label="${item.name}" title="${item.name}"`}>${withNames ? `<span>${item.name}</span>` : ''}</button>`).join('');
  }
  function renderShell() {
    document.querySelectorAll('[data-nav]').forEach(link => {
      if (link.dataset.nav === route() || (link.closest('.tabbar') && ((link.dataset.nav === 'analysis' && route() === 'compare') || (link.dataset.nav === 'categories' && route() === 'limits')))) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('periodLabel').textContent = rangeDescription();
    $('periodLabel').classList.toggle('is-range', !!(filters.from || filters.to));
    $('rangePicker').classList.toggle('active', !!(filters.from || filters.to));
    $('todayButton').hidden = selectedMonth === currentMonth && !filters.from && !filters.to;
    $('railStatus').innerHTML = railStatusMarkup() + (session ? `<p class="rail-sync"><span data-sync="${syncState}">${syncText[syncState]}</span></p>` : '');
    document.body.dataset.route = route();
    applyWallpaper();
  }
  // Stav aktuálního měsíce v levém panelu: vždy dnešní měsíc, bez ohledu na vybrané období.
  function railStatusMarkup() {
    const rows = data.transactions.filter(row => row.date.startsWith(currentMonth));
    const total = sumCents(rows);
    const label = monthFormat.format(new Date(today.getFullYear(), today.getMonth(), 1));
    const title = label[0].toLocaleUpperCase('cs') + label.slice(1);
    if (!data.budgetCents) return `<a class="rail-card" href="#/limits"><span class="rail-card-label">${title}</span><strong>${wholeCrowns.format(total / 100)}</strong><span class="rail-card-note">Nastavit měsíční limit</span></a>`;
    const share = total / data.budgetCents;
    return `<a class="rail-card ${share > 1 ? 'over' : ''}" href="#/overview"><span class="rail-card-label">${title}</span><strong>${wholeCrowns.format(total / 100)}</strong><span class="rail-meter" aria-hidden="true"><i style="width:${Math.min(100, 100 * share).toFixed(1)}%"></i></span><span class="rail-card-note">${share > 1 ? `Přečerpáno o ${wholeCrowns.format((total - data.budgetCents) / 100)}` : `${Math.round(100 * share)} % z ${wholeCrowns.format(data.budgetCents / 100)}`}</span></a>`;
  }
  function countWord(number) { return number === 1 ? 'platba' : number >= 2 && number <= 4 ? 'platby' : 'plateb'; }
  function monthInfo() {
    if (!selectedMonth || filters.from || filters.to) return null;
    const [year, month] = selectedMonth.split('-').map(Number);
    const days = new Date(year, month, 0).getDate();
    const isCurrent = selectedMonth === currentMonth;
    const elapsed = isCurrent ? today.getDate() : selectedMonth < currentMonth ? days : 0;
    const prev = new Date(year, month - 2, 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const prevDays = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();
    const cutoff = `${prevKey}-${String(isCurrent ? Math.min(elapsed, prevDays) : prevDays).padStart(2, '0')}`;
    const prevRows = data.transactions.filter(row => row.date.startsWith(prevKey));
    const earliest = data.transactions.reduce((min, row) => row.date < min ? row.date : min, '9999');
    return { days, isCurrent, elapsed, prevIndex: prev.getMonth(), prevHasData: prevRows.length > 0 && earliest <= `${prevKey}-03`, prevTotal: sumCents(applyFilters(prevRows.filter(row => row.date <= cutoff))) };
  }
  function deltaMarkup(total, info) {
    if (!info) return '';
    const month = monthLocative[info.prevIndex];
    if (!info.prevHasData || !info.prevTotal) return `<p class="delta none">Srovnání s minulým měsícem se ukáže, až bude v datech celý.</p>`;
    const change = (total - info.prevTotal) / info.prevTotal;
    const percent = Math.round(Math.abs(change) * 100);
    const toDay = info.isCurrent ? ` ke stejnému dni (${info.elapsed}.)` : '';
    if (percent === 0) return `<p class="delta same">${uiIcon('same')}<span>Stejně jako v ${month}${toDay}</span></p>`;
    return `<p class="delta ${change < 0 ? 'down' : 'up'}">${uiIcon(change < 0 ? 'down' : 'up')}<span>O ${percent} % ${change < 0 ? 'méně' : 'více'} než v ${month}${toDay}</span></p>`;
  }
  function filterNotice() {
    if (!hasContentFilter()) return '';
    const parts = [];
    if (filters.category) parts.push(filters.category);
    if (filters.search) parts.push(`„${filters.search}“`);
    if (filters.min || filters.max) parts.push('rozsah částky');
    if (filters.counting === 'counted') parts.push('jen započítané');
    if (filters.counting === 'excluded') parts.push('jen nepočítané');
    return `<div class="notice" role="status">${uiIcon('filter')}<span>Čísla platí jen pro výběr: <strong>${escapeHtml(parts.join(', '))}</strong></span><button type="button" class="text-button" data-action="clear-content-filters">Zrušit výběr</button></div>`;
  }
  function categoryListMarkup(rows, limit = Infinity, withLimits = false) {
    const totals = new Map(totalsByCategory(rows));
    const budgets = withLimits ? data.categoryBudgets : {};
    Object.keys(budgets).forEach(name => { if (!totals.has(name) && category(name)) totals.set(name, 0); });
    const all = [...totals].sort((a, b) => b[1] - a[1]);
    const total = all.reduce((sum, [, cents]) => sum + cents, 0) || 1;
    const ranked = all.slice(0, limit);
    const max = ranked[0]?.[1] || 1;
    return ranked.map(([name, cents], index) => {
      const budget = budgets[name];
      const over = budget && cents > budget;
      const width = budget ? Math.min(100, 100 * cents / budget) : 100 * cents / max;
      const side = budget ? `<span class="cat-share ${over ? 'over' : ''}">${over ? `o ${wholeCrowns.format((cents - budget) / 100)} přes` : `z ${wholeCrowns.format(budget / 100)}`}</span>` : `<span class="cat-share">${100 * cents / total < 1 ? '&lt; 1' : Math.round(100 * cents / total)} %</span>`;
      const tip = budget ? `${name}|${moneyCents(cents)} z limitu ${wholeCrowns.format(budget / 100)}` : `${name}|${moneyCents(cents)}`;
      return `<button type="button" class="cat-row ${over ? 'over' : ''} ${budget ? 'limited' : ''}" data-action="open-category" data-value="${escapeHtml(name)}" data-tip="${escapeHtml(tip)}" style="--cat:${catColor(name)};--d:${index}" aria-label="${escapeHtml(name)}, ${moneyCents(cents)}${budget ? `, limit ${wholeCrowns.format(budget / 100)}` : ''}. Zobrazit platby.">
      <span class="cat-icon">${categoryIcon(name)}</span>
      <span class="cat-name">${escapeHtml(name)}</span>
      ${side}
      <span class="cat-value">${moneyCents(cents)}</span>
      <span class="cat-track" aria-hidden="true"><span class="cat-fill" style="width:${Math.max(cents ? 1.5 : 0, width).toFixed(2)}%"></span></span>
    </button>`;
    }).join('') || '<p class="empty">V tomto výběru nejsou započítané výdaje.</p>';
  }
  function transactionRow(row, detailed = false, showDate = false) {
    const cat = categoryName(row);
    const meta = [showDate ? `<span>${displayDate(row.date)}</span>` : '', `<span class="${detailed ? 'tx-cat' : ''}">${escapeHtml(cat)}</span>`, row.note ? `<span>${escapeHtml(row.note)}</span>` : ''].filter(Boolean).join('');
    return `<div class="tx ${cat === 'Nepočítá se' ? 'excluded' : ''}" role="button" tabindex="0" data-action="edit" data-id="${escapeHtml(row.id)}" aria-label="Upravit ${escapeHtml(row.description)}, ${positiveMoney(row.cents)}">
      ${logoMarkup(row)}
      <div class="tx-main"><span class="tx-name">${escapeHtml(row.description)}</span><span class="tx-meta">${meta}</span></div>
      ${detailed ? `<button type="button" class="chip-button" data-action="pick-category" data-id="${escapeHtml(row.id)}" style="--cat:${catColor(cat)}" aria-label="Kategorie ${escapeHtml(cat)}, změnit"><i aria-hidden="true"></i><span>${escapeHtml(cat)}</span></button>` : ''}
      <span class="tx-amount">${positiveMoney(row.cents)}</span>
    </div>`;
  }
  function dayGroupsMarkup(rows, detailed = false) {
    const groups = [];
    rows.forEach(row => { const last = groups.at(-1); if (last && last.date === row.date) last.rows.push(row); else groups.push({ date: row.date, rows: [row] }); });
    return groups.map(group => {
      const label = dayLong.format(dateObject(group.date));
      return `<section class="day"><header class="day-head"><h3>${label[0].toLocaleUpperCase('cs') + label.slice(1)}</h3><span>${moneyCents(sumCents(group.rows))}</span></header>${group.rows.map(row => transactionRow(row, detailed)).join('')}</section>`;
    }).join('');
  }
  function renderSpendTrend(rows) {
    const counted = countedRows(rows);
    if (!counted.length) return '<div class="trend"><div class="trend-head"><h2>Útrata v čase</h2></div><p class="empty">Pro toto období nejsou započítané výdaje.</p></div>';
    const dates = counted.map(row => row.date).sort();
    const start = filters.from || (selectedMonth ? `${selectedMonth}-01` : dates[0]);
    const end = filters.to || (selectedMonth ? (selectedMonth === currentMonth ? [today.toLocaleDateString('sv-SE'), dates.at(-1)].sort().at(-1) : new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0).toLocaleDateString('sv-SE')) : dates.at(-1));
    const span = Math.max(0, Math.round((dateObject(end) - dateObject(start)) / 86400000));
    const mode = span <= 45 ? 'day' : span <= 240 ? 'week' : span <= 1460 ? 'month' : 'year';
    const names = { day: 'Denní výdaje', week: 'Týdenní výdaje', month: 'Měsíční výdaje', year: 'Roční výdaje' };
    const keyFor = iso => {
      if (mode === 'day') return iso;
      if (mode === 'month') return iso.slice(0, 7);
      if (mode === 'year') return iso.slice(0, 4);
      const date = dateObject(iso);
      date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
      return date.toISOString().slice(0, 10);
    };
    const first = keyFor(start), last = keyFor(end);
    const keys = [];
    if (mode === 'year') {
      for (let year = Number(first); year <= Number(last); year++) keys.push(String(year));
    } else if (mode === 'month') {
      let year = Number(first.slice(0, 4)), month = Number(first.slice(5, 7));
      while (`${year}-${String(month).padStart(2, '0')}` <= last) { keys.push(`${year}-${String(month).padStart(2, '0')}`); month++; if (month > 12) { year++; month = 1; } }
    } else {
      const date = dateObject(first);
      while (date.toISOString().slice(0, 10) <= last) { keys.push(date.toISOString().slice(0, 10)); date.setUTCDate(date.getUTCDate() + (mode === 'week' ? 7 : 1)); }
    }
    const sums = new Map(keys.map(key => [key, 0]));
    counted.forEach(row => { const key = keyFor(row.date); if (sums.has(key)) sums.set(key, sums.get(key) - row.cents); });
    const max = Math.max(...sums.values(), 1);
    const average = [...sums.values()].reduce((sum, value) => sum + value, 0) / keys.length;
    const labelFor = key => mode === 'year' ? key : mode === 'month' ? new Intl.DateTimeFormat('cs-CZ', { month: 'short', year: 'numeric' }).format(new Date(`${key}-01T12:00:00Z`)) : displayDate(key);
    const bars = [...sums].map(([key, value], index) => `<span class="trend-column" tabindex="0" ${mode === 'day' && value ? `role="button" data-action="open-day" data-value="${key}"` : ''} data-tip="${escapeHtml(labelFor(key))}|${value ? escapeHtml(positiveMoney(value)) : 'bez plateb'}" aria-label="${escapeHtml(labelFor(key))}: ${escapeHtml(positiveMoney(value))}${mode === 'day' && value ? '. Zobrazit platby.' : ''}" style="--d:${index}"><span class="trend-bar ${value === max ? 'peak' : ''}" style="height:${value ? Math.max(2, Math.round(100 * value / max)) : 0}%"></span></span>`).join('');
    const unit = mode === 'day' ? 'den' : mode === 'week' ? 'týden' : mode === 'month' ? 'měsíc' : 'rok';
    return `<div class="trend"><div class="trend-head"><h2>${names[mode]}</h2><p class="trend-peak">Nejvyšší ${unit} <strong>${positiveMoney(max)}</strong></p></div><div class="trend-plot" style="grid-template-columns:repeat(${keys.length},minmax(0,1fr))" role="group" aria-label="${names[mode]}"><span class="trend-average" style="bottom:${(100 * average / max).toFixed(1)}%" aria-hidden="true"><i>průměr ${wholeCrowns.format(average / 100)}</i></span>${bars}</div><div class="trend-axis"><span>${escapeHtml(labelFor(first))}</span><span>${escapeHtml(labelFor(last))}</span></div></div>`;
  }
  function budgetFormMarkup(compact = false) {
    const value = data.budgetCents ? String(data.budgetCents / 100).replace('.', ',') : '';
    return `<form id="budgetForm" class="budget-form"><label class="field">Měsíční limit v Kč<input type="text" name="budget" inputmode="decimal" value="${escapeHtml(value)}" placeholder="Např. 25 000" required></label><button type="submit" class="primary-button">${data.budgetCents ? 'Uložit limit' : 'Nastavit limit'}</button>${data.budgetCents ? '<button type="button" class="text-button" data-action="clear-budget">Zrušit limit</button>' : ''}${compact || !data.budgetCents ? '' : '<button type="button" class="text-button" data-action="cancel-budget">Zpět</button>'}</form>`;
  }
  function renderBudget(rows, total, info) {
    if (!info) return '';
    if (!data.budgetCents || budgetEditing) {
      return `<section class="panel budget" aria-label="Měsíční limit"><div class="budget-empty"><div><h2>Měsíční limit</h2><p class="muted">${data.budgetCents ? 'Uprav strop, proti kterému se měsíc měří.' : 'Nastav si strop na měsíc. Uvidíš, kolik zbývá, a jestli utrácíš rychleji, než měsíc ubíhá.'}</p></div>${budgetFormMarkup()}</div></section>`;
    }
    const budget = data.budgetCents;
    const scale = Math.max(budget, total);
    const remaining = budget - total;
    const segments = totalsByCategory(rows).map(([name, cents]) => `<button type="button" class="ruler-seg" data-action="open-category" data-value="${escapeHtml(name)}" data-tip="${escapeHtml(name)}|${moneyCents(cents)} · ${Math.round(100 * cents / (total || 1))} %" aria-label="${escapeHtml(name)}: ${moneyCents(cents)}" style="width:${(100 * cents / scale).toFixed(3)}%;background:${catColor(name)}"></button>`).join('');
    const dayWidth = 100 * budget / scale;
    const ticks = Array.from({ length: info.days }, (_, index) => { const day = index + 1; const labelled = day === 1 || day % 5 === 0 || day === info.days; return `<span class="ruler-tick ${labelled ? 'labelled' : ''} ${info.isCurrent && day === info.elapsed ? 'today' : ''}">${labelled && !(day === info.days && info.days % 5 === 1) ? `<i>${day}.</i>` : ''}</span>`; }).join('');
    const todayPosition = info.isCurrent ? dayWidth * info.elapsed / info.days : null;
    const expected = budget * info.elapsed / info.days;
    const daysLeft = info.days - info.elapsed;
    let pace = '';
    if (remaining < 0) pace = `<p class="pace over">Limit je přečerpaný o <strong>${moneyCents(-remaining)}</strong>.</p>`;
    else if (info.isCurrent) {
      const difference = expected - total;
      pace = `<p class="pace ${difference >= 0 ? 'under' : 'ahead'}">${difference >= 0 ? `Jsi <strong>${moneyCents(difference)}</strong> pod tempem měsíce.` : `Utrácíš o <strong>${moneyCents(-difference)}</strong> rychleji, než měsíc ubíhá.`}${daysLeft > 0 ? ` Na zbylých ${daysLeft} ${daysLeft === 1 ? 'den' : daysLeft < 5 ? 'dny' : 'dní'} vychází ${wholeCrowns.format(remaining / daysLeft / 100)} denně.` : ''}</p>`;
    } else pace = `<p class="pace under">Měsíc skončil <strong>${moneyCents(remaining)}</strong> pod limitem.</p>`;
    return `<section class="panel budget" aria-label="Měsíční limit">
      <div class="budget-head"><div><h2>Měsíční limit</h2><p class="budget-remaining ${remaining < 0 ? 'over' : ''}"><strong>${remaining < 0 ? 'Přečerpáno ' + moneyCents(-remaining) : 'Zbývá ' + moneyCents(remaining)}</strong><span>z ${wholeCrowns.format(budget / 100)}</span></p></div><button type="button" class="secondary-button" data-action="edit-budget">Upravit limit</button></div>
      <div class="ruler" role="group" aria-label=""Utraceno ${moneyCents(total)} z limitu ${moneyCents(budget)}${info.isCurrent ? `, dnes je ${info.elapsed}. den z ${info.days}` : ''}">
        <div class="ruler-track"><div class="ruler-fill">${segments}</div>${total > budget ? `<span class="ruler-limit" style="left:${dayWidth.toFixed(3)}%"><i>limit</i></span>` : ''}${todayPosition !== null ? `<span class="ruler-today" style="left:${todayPosition.toFixed(3)}%"><i>dnes</i></span>` : ''}</div>
        <div class="ruler-scale" style="width:${dayWidth.toFixed(3)}%;grid-template-columns:repeat(${info.days},minmax(0,1fr))">${ticks}</div>
      </div>${pace}</section>`;
  }
  function renderMerchantSpotlight(rows) {
    const brands = new Map();
    const counted = countedRows(rows);
    counted.forEach(row => {
      const id = logoId(row.description);
      if (!id) return;
      const current = brands.get(id) || { cents: 0, count: 0 };
      current.cents -= row.cents; current.count++;
      brands.set(id, current);
    });
    const top = [...brands].sort((a, b) => b[1].cents - a[1].cents).slice(0, 12);
    if (!top.length) return '';
    const total = -counted.reduce((sum, row) => sum + row.cents, 0) || 1;
    return `<section class="panel carousel-panel" data-scroller="disable"><div class="panel-head"><h2>Kde utrácíš nejvíc</h2><div class="carousel-nav"><button type="button" class="icon-button" data-scroll="-1" aria-label="Předchozí obchody">${uiIcon('left')}</button><button type="button" class="icon-button" data-scroll="1" aria-label="Další obchody">${uiIcon('right')}</button></div></div><div class="carousel" data-track tabindex="0" role="group" aria-label="Obchody podle útraty">${top.map(([id, item], index) => `<article class="merchant" style="--d:${index}"><div class="merchant-top"><span class="brand-logo large" aria-hidden="true">${logoImg(id)}</span><span class="merchant-rank">${index + 1}.</span></div><span class="merchant-name">${escapeHtml(logoNames[id])}</span><strong>${positiveMoney(item.cents)}</strong><span class="merchant-count">${item.count} ${countWord(item.count)} · ${Math.max(1, Math.round(100 * item.cents / total))} % útraty</span></article>`).join('')}</div></section>`;
  }
  function renderOverview() {
    const rows = filteredRows();
    const counted = countedRows(rows);
    const total = sumCents(rows);
    const info = monthInfo();
    const cats = categoryListMarkup(rows, 8, !!info);
    const catCount = Math.min(8, Math.max(totalsByCategory(rows).length, info ? Object.keys(data.categoryBudgets).length : 0));
    // Tolik posledních plateb, aby oba panely vedle sebe vyšly stejně vysoké.
    const newest = filters.sort === 'newest' ? rows : rows.slice().sort((a, b) => b.date.localeCompare(a.date));
    const recent = [];
    let used = 0;
    for (const row of newest) {
      const cost = 52 + (recent.at(-1)?.date === row.date ? 0 : 40);
      if (recent.length >= 4 && used + cost > Math.max(4, catCount) * 52 + 8) break;
      recent.push(row); used += cost;
    }
    const facts = [];
    if (info && info.elapsed) facts.push(['Denní průměr', wholeCrowns.format(total / info.elapsed / 100)]);
    if (info && info.isCurrent && info.elapsed) facts.push(['Odhad do konce měsíce', wholeCrowns.format(total / info.elapsed * info.days / 100)]);
    facts.push(['Plateb', String(counted.length)]);
    if (facts.length < 3) facts.push(['Kategorií', String(totalsByCategory(rows).length)]);
    return `<div class="page-head"><h1>Přehled</h1></div>${filterNotice()}${welcomePanel()}
      <section class="panel hero" aria-label="Souhrn období">
        <div class="hero-main"><h2 class="hero-label">Utraceno · ${escapeHtml(rangeDescription())}</h2><strong class="hero-number" data-count="${total}">${moneyCents(total)}</strong>${deltaMarkup(total, info)}<dl class="hero-facts">${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></div>
        ${renderSpendTrend(rows)}
      </section>
      ${renderBudget(rows, total, info)}
      <div class="two-col">
        <section class="panel"><div class="panel-head"><h2>Kam peníze šly</h2><a class="inline-link" href="${info ? '#/limits' : '#/analysis'}">${info ? 'Limity kategorií' : 'Celá analýza'}${uiIcon('right')}</a></div><div class="cat-list">${cats}</div></section>
        <section class="panel"><div class="panel-head"><h2>Poslední platby</h2><a class="inline-link" href="#/transactions">Všechny platby${uiIcon('right')}</a></div><div class="tx-list">${recent.length ? dayGroupsMarkup(recent) : `<p class="empty">V tomto období zatím nejsou žádné platby. <a class="inline-link" href="#/add">Přidat první</a></p>`}</div></section>
      </div>
      ${renderMerchantSpotlight(rows)}`;
  }
  function filterCategoryButtons() {
    const current = baseRows();
    const counts = new Map(data.categories.map(item => [item.name, 0]));
    current.forEach(row => counts.set(categoryName(row), (counts.get(categoryName(row)) || 0) + 1));
    return `<button type="button" class="choice-button" data-action="filter-category" data-value="" aria-pressed="${!filters.category}">Všechny <small>${current.length}</small></button>` +
      data.categories.map(item => `<button type="button" class="choice-button ${counts.get(item.name) ? '' : 'is-empty'}" data-action="filter-category" data-value="${escapeHtml(item.name)}" aria-pressed="${filters.category === item.name}" style="--cat:${catColor(item.name)}"><i class="dot" aria-hidden="true"></i>${escapeHtml(item.name)} <small>${counts.get(item.name) || 0}</small></button>`).join('');
  }
  function segmented(action, current, options, label) {
    return `<div class="segmented" role="group" aria-label="${label}">${options.map(([value, text]) => `<button type="button" data-action="${action}" data-value="${value}" aria-pressed="${current === value}">${text}</button>`).join('')}</div>`;
  }
  function renderTransactions() {
    const extra = [filters.from, filters.to, filters.min, filters.max].filter(Boolean).length + (filters.counting !== 'all' ? 1 : 0);
    return `<div class="page-head"><h1>Transakce</h1></div>
      <section class="panel filters" aria-label="Filtry plateb">
        <div class="filters-top">
          <label class="field search-field"><span class="visually-hidden">Hledat obchod nebo poznámku</span><input id="searchFilter" data-filter="search" type="search" value="${escapeHtml(filters.search)}" placeholder="Hledat obchod nebo poznámku"></label>
          <button type="button" class="secondary-button" data-action="toggle-filters" aria-expanded="${filtersOpen}" aria-controls="moreFilters">${uiIcon('filter')}Další filtry${extra ? ` <small class="count-badge">${extra}</small>` : ''}</button>
        </div>
        <div id="moreFilters" class="filters-more" ${filtersOpen ? '' : 'hidden'}>
          <label class="field">Od data<input data-filter="from" type="date" value="${escapeHtml(filters.from)}"></label>
          <label class="field">Do data<input data-filter="to" type="date" value="${escapeHtml(filters.to)}"></label>
          <label class="field">Od částky Kč<input data-filter="min" type="text" inputmode="decimal" value="${escapeHtml(filters.min)}" placeholder="0"></label>
          <label class="field">Do částky Kč<input data-filter="max" type="text" inputmode="decimal" value="${escapeHtml(filters.max)}" placeholder="Bez omezení"></label>
          <div class="field"><span>Započítání</span><span id="countingSwitch">${segmented('filter-counting', filters.counting, [['all', 'Vše'], ['counted', 'Započítané'], ['excluded', 'Nepočítá se']], 'Započítání')}</span></div>
        </div>
        <div class="scroller" data-scroller="hide"><button type="button" class="scroller-button start" data-scroll="-1" aria-label="Posunout kategorie zpět" hidden>${uiIcon('left')}</button><div class="chip-scroll" id="filterCategories" data-track role="group" aria-label="Kategorie">${filterCategoryButtons()}</div><button type="button" class="scroller-button end" data-scroll="1" aria-label="Posunout kategorie dál" hidden>${uiIcon('right')}</button></div>
      </section>
      <section class="panel results">
        <div class="results-head"><p id="resultsSummary" class="results-summary" aria-live="polite"></p><div class="results-tools"><button type="button" class="text-button" id="clearFilters" data-action="clear-filters">Vymazat filtry</button><span id="sortSwitch">${segmented('sort', filters.sort, [['newest', 'Nejnovější'], ['oldest', 'Nejstarší'], ['highest', 'Nejvyšší']], 'Seřazení')}</span></div></div>
        <div id="transactionResults" class="tx-list"></div>
      </section>`;
  }
  function renderTransactionResults() {
    if (route() !== 'transactions') return;
    const rows = filteredRows();
    $('transactionResults').innerHTML = rows.length ? (filters.sort === 'highest' ? `<section class="day">${rows.map(row => transactionRow(row, true, true)).join('')}</section>` : dayGroupsMarkup(rows, true)) : `<div class="empty-state"><p>Nic neodpovídá vybraným filtrům.</p><button type="button" class="secondary-button" data-action="clear-filters">Vymazat filtry</button></div>`;
    $('resultsSummary').innerHTML = `<strong>${moneyCents(sumCents(rows))}</strong><span>${rows.length} ${countWord(rows.length)}</span>`;
    $('clearFilters').hidden = !(hasContentFilter() || filters.from || filters.to);
  }
  // Změna filtru na stránce Transakce bez překreslení celé stránky: rozložení i fokus zůstanou na místě.
  function refreshTransactions() {
    if (route() !== 'transactions' || !$('filterCategories')) { render(); return; }
    const active = document.activeElement;
    const key = active?.dataset?.action ? `[data-action="${active.dataset.action}"][data-value="${CSS.escape(active.dataset.value ?? '')}"]` : null;
    const strip = $('filterCategories');
    const scroll = strip.scrollLeft;
    strip.innerHTML = filterCategoryButtons();
    strip.scrollLeft = scroll;
    strip.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    strip.closest('[data-scroller]').syncScroller?.();
    $('sortSwitch').innerHTML = segmented('sort', filters.sort, [['newest', 'Nejnovější'], ['oldest', 'Nejstarší'], ['highest', 'Nejvyšší']], 'Seřazení');
    $('countingSwitch').innerHTML = segmented('filter-counting', filters.counting, [['all', 'Vše'], ['counted', 'Započítané'], ['excluded', 'Nepočítá se']], 'Započítání');
    renderTransactionResults();
    if (key) document.querySelector(key)?.focus({ preventScroll: true });
  }
  function monthsChartMarkup() {
    const endKey = selectedMonth || currentMonth;
    const [year, month] = endKey.split('-').map(Number);
    const items = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(year, month - 6 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const full = monthFormat.format(date);
      return { key, full: full[0].toLocaleUpperCase('cs') + full.slice(1), label: monthShort.format(date).replace('.', ''), cents: sumCents(applyFilters(data.transactions.filter(row => row.date.startsWith(key)))) };
    });
    const max = Math.max(1, ...items.map(item => item.cents));
    return `<div class="bars" style="grid-template-columns:repeat(${items.length},minmax(0,1fr))" role="group" aria-label="Výdaje za posledních šest měsíců">${items.map((item, index) => `<button type="button" class="bar-col ${item.key === endKey ? 'current' : ''}" data-action="select-month" data-value="${item.key}" data-tip="${escapeHtml(item.full)}|${item.cents ? moneyCents(item.cents) : 'bez plateb'}" aria-label="${escapeHtml(item.full)}: ${moneyCents(item.cents)}. Zobrazit měsíc." style="--d:${index}"><span class="bar-value">${item.cents ? compact.format(item.cents / 100) : '–'}</span><span class="bar" style="height:${item.cents ? Math.max(3, Math.round(140 * item.cents / max)) : 2}px"></span><span class="bar-label">${item.label}</span></button>`).join('')}</div>`;
  }
  function renderAnalysis() {
    const rows = filteredRows();
    const counted = countedRows(rows);
    const total = sumCents(rows);
    const info = monthInfo();
    const ranked = totalsByCategory(rows);
    const slices = ranked.slice(0, 5).map(([name, cents]) => ({ name, cents }));
    const rest = ranked.slice(5).reduce((sum, [, cents]) => sum + cents, 0);
    if (rest) slices.push({ name: 'Ostatní', cents: rest });
    const circumference = 2 * Math.PI * 54;
    let offset = 0;
    const arcs = slices.map((slice, index) => {
      const length = total ? circumference * slice.cents / total : 0;
      const drawn = Math.max(0, length - 1.5);
      const arc = `<circle class="donut-arc" cx="70" cy="70" r="54" fill="none" stroke="${catColor(slice.name)}" stroke-width="20" stroke-dasharray="${drawn.toFixed(2)} ${(circumference - drawn).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" style="--d:${index}" data-tip="${escapeHtml(slice.name)}|${moneyCents(slice.cents)} · ${total ? Math.round(100 * slice.cents / total) : 0} %"/>`;
      offset += length; return arc;
    }).join('');
    const legend = slices.map(slice => { const inner = `<i style="background:${catColor(slice.name)}"></i><span>${escapeHtml(slice.name)}</span><span class="legend-value">${moneyCents(slice.cents)}</span><strong>${total ? Math.round(100 * slice.cents / total) : 0} %</strong>`; return slice.name === 'Ostatní' ? `<div class="legend-row">${inner}</div>` : `<button type="button" class="legend-row" data-action="open-category" data-value="${escapeHtml(slice.name)}">${inner}</button>`; }).join('');
    const weeks = new Map();
    counted.forEach(row => {
      const day = dateObject(row.date);
      day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
      const key = day.toISOString().slice(0, 10);
      weeks.set(key, (weeks.get(key) || 0) - row.cents);
    });
    const weekRows = [...weeks].sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
    const maxWeek = Math.max(1, ...weekRows.map(([, cents]) => cents));
    const weekMarkup = weekRows.map(([key, cents], index) => { const end = dateObject(key); end.setUTCDate(end.getUTCDate() + 6); return `<div class="bar-col ${cents === maxWeek ? 'current' : ''}" tabindex="0" data-tip="Týden ${dateTiny.format(dateObject(key)).replace(/\s/g, '')} – ${dateTiny.format(end).replace(/\s/g, '')}|${positiveMoney(cents)}" aria-label="Týden od ${displayDate(key)}: ${positiveMoney(cents)}" style="--d:${index}"><span class="bar-value">${compact.format(cents / 100)}</span><span class="bar" style="height:${Math.max(3, Math.round(140 * cents / maxWeek))}px"></span><span class="bar-label">od ${dateTiny.format(dateObject(key)).replace(/\s/g, '')}</span></div>`; }).join('');
    const largest = counted.slice().sort((a, b) => a.cents - b.cents).slice(0, 6).map(row => transactionRow(row, false, true)).join('');
    const subscriptions = ranked.find(([name]) => name === 'Předplatné')?.[1] || 0;
    return `<div class="page-head"><h1>Analýza</h1>${analysisTabs('analysis')}</div>${filterNotice()}
      <div class="two-col lead">
        <section class="panel hero-lite"><h2 class="hero-label">Utraceno · ${escapeHtml(rangeDescription())}</h2><strong class="hero-number" data-count="${total}">${moneyCents(total)}</strong>${deltaMarkup(total, info)}<dl class="hero-facts"><div><dt>Plateb</dt><dd>${counted.length}</dd></div><div><dt>Průměrná platba</dt><dd>${counted.length ? wholeCrowns.format(total / counted.length / 100) : '–'}</dd></div><div><dt>Předplatné</dt><dd>${wholeCrowns.format(subscriptions / 100)}</dd></div></dl></section>
        <section class="panel"><div class="panel-head"><h2>Posledních šest měsíců</h2></div>${monthsChartMarkup()}</section>
      </div>
      <div class="two-col">
        <section class="panel"><div class="panel-head"><h2>Podle kategorií</h2></div><div class="cat-list">${categoryListMarkup(rows, Infinity, !!info)}</div></section>
        <div class="stack"><section class="panel"><div class="panel-head"><h2>Podíl kategorií</h2></div>${total ? `<div class="donut-wrap"><div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="Podíl výdajů podle kategorií"><g transform="rotate(-90 70 70)">${arcs}</g></svg><div class="donut-hole"><strong>${ranked.length}</strong><span>${ranked.length === 1 ? 'kategorie' : ranked.length < 5 ? 'kategorie' : 'kategorií'}</span></div></div><div class="legend">${legend}</div></div>` : '<p class="empty">V tomto výběru nejsou započítané výdaje.</p>'}</section>
        <section class="panel"><div class="panel-head"><h2>Výdaje po týdnech</h2></div>${weekRows.length ? `<div class="bars" style="grid-template-columns:repeat(${weekRows.length},minmax(0,1fr))" role="group" aria-label="Týdenní výdaje">${weekMarkup}</div>` : '<p class="empty">Pro toto období nejsou data.</p>'}</section></div>
      </div>
      <section class="panel"><div class="panel-head"><h2>Nejvyšší platby</h2></div><div class="tx-list"><section class="day two-up">${largest || '<p class="empty">Žádné platby</p>'}</section></div></section>`;
  }
  // ——— Účet a synchronizace (jen na webu; z disku běží aplikace bez přihlášení) ———
  const syncText = { saved: 'Uloženo v účtu', pending: 'Ukládám…', saving: 'Ukládám…', error: 'Neuloženo, zkusím to znovu' };
  function setSync(state) {
    syncState = state;
    document.querySelectorAll('[data-sync]').forEach(node => { node.textContent = syncText[state]; node.dataset.sync = state; });
  }
  function emptyState() { return migrate({ version: 2, transactions: [], categories: seed.baseCategories.map(name => ({ name, icon: defaultIcons[name] || 'ostatní' })), brandOverrides: {} }); }
  function schedulePush() { setSync('pending'); clearTimeout(pushTimer); pushTimer = setTimeout(push, 1200); }
  async function push() {
    clearTimeout(pushTimer);
    if (!session) return;
    if (pushing) { pushAgain = true; return; }
    pushing = true; setSync('saving');
    const stamp = data.updatedAt, target = session;
    try {
      target.chunks = await cloud.save(target.uid, data, target.chunks);
      if (session === target) { localStorage.setItem(`${storageKey}:synced`, String(stamp)); setSync(data.updatedAt === stamp ? 'saved' : 'pending'); }
    } catch { if (session === target) setSync('error'); }
    pushing = false;
    if (pushAgain && session) { pushAgain = false; push(); }
  }
  async function startSession(user) {
    document.body.dataset.auth = 'loading';
    storageKey = `${APP_KEY}:${user.uid}`;
    session = { uid: user.uid, email: user.email, chunks: 0 };
    const local = validState(readJson(storageKey)) ? readJson(storageKey) : null;
    const localDirty = local && (local.updatedAt || 0) > (Number(localStorage.getItem(`${storageKey}:synced`)) || 0);
    let remote = null, offline = false;
    try { remote = await cloud.load(user.uid); } catch { offline = true; }
    if (session?.uid !== user.uid) return;
    if (offline && !local) { showGate('Nepodařilo se načíst data. Zkontroluj internet a zkus to znovu.'); return; }
    if (remote && validState(remote) && !(localDirty && local.updatedAt > (remote.updatedAt || 0))) {
      categoryMigrated = false;
      data = migrate(remote);
      session.chunks = Math.max(1, Math.ceil(data.transactions.length / 2000));
      if (categoryMigrated) { categoryMigrated = false; setTimeout(save, 0); }
      try { localStorage.setItem(storageKey, JSON.stringify(data)); localStorage.setItem(`${storageKey}:synced`, String(data.updatedAt || 0)); } catch {}
      setSync('saved');
    } else {
      data = migrate(local || emptyState());
      if (!offline) { data.updatedAt = data.updatedAt || Date.now(); try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {} push(); } else setSync('error');
    }
    selectedMonth = currentMonth; periodBeforeRange = currentMonth; resetFilters();
    document.body.dataset.auth = 'in';
    $('authGate').hidden = true;
    animateNext = true;
    render();
  }
  function showGate(error = '') {
    session = null; clearTimeout(pushTimer); storageKey = APP_KEY; accountDeleting = false;
    data = migrate({ version: 2, transactions: [], categories: [], brandOverrides: {} });
    $('appContent').innerHTML = '';
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    document.body.dataset.auth = 'out';
    $('authGate').hidden = false;
    $('authError').hidden = !error; $('authError').textContent = error;
    $('authInfo').hidden = true;
    setAuthMode(authMode);
  }
  function setAuthMode(mode) {
    authMode = mode;
    document.querySelectorAll('[data-auth-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.authMode === mode)));
    $('authTitle').textContent = mode === 'in' ? 'Přihlášení' : 'Nový účet';
    $('authSubmit').textContent = mode === 'in' ? 'Přihlásit se' : 'Vytvořit účet';
    $('authForgot').hidden = mode !== 'in';
    $('authForm').elements.password.autocomplete = mode === 'in' ? 'current-password' : 'new-password';
    $('authPasswordHelp').hidden = mode === 'in';
  }
  async function pullIfNewer() {
    if (!session || pushing || syncState !== 'saved') { if (session && syncState === 'error') push(); return; }
    const target = session;
    try {
      const stamp = await cloud.stamp(target.uid);
      if (session !== target || !stamp || stamp <= (data.updatedAt || 0)) return;
      const remote = await cloud.load(target.uid);
      if (session !== target || !remote || !validState(remote)) return;
      data = migrate(remote);
      try { localStorage.setItem(storageKey, JSON.stringify(data)); localStorage.setItem(`${storageKey}:synced`, String(data.updatedAt || 0)); } catch {}
      render(); toast('Načetl jsem novější data z jiného zařízení.');
    } catch {}
  }
  function accountPanel() {
    if (!session) return '';
    return `<section class="panel"><div class="panel-head"><h2>Účet</h2><span class="sync-pill" data-sync="${syncState}">${syncText[syncState]}</span></div><p class="field-help">Přihlášen jako <strong>${escapeHtml(session.email)}</strong>. Výdaje, limity i loga se ukládají do tvého účtu a jsou stejné na všech zařízeních.</p>
      <form id="passwordForm" class="form-grid account-form"><label>Současné heslo<input type="password" name="current" autocomplete="current-password" required></label><label>Nové heslo<input type="password" name="next" autocomplete="new-password" minlength="8" required></label><div class="form-actions"><button type="submit" class="secondary-button">Změnit heslo</button><button type="button" class="secondary-button" data-action="sign-out">Odhlásit se</button><button type="button" class="text-button danger-text" data-action="ask-delete-account">Smazat účet</button></div></form>
      ${accountDeleting ? `<form id="deleteAccountForm" class="delete-box"><p><strong>Smazat účet a všechna data?</strong> Nejde to vrátit. Jestli chceš data zachovat, stáhni si nejdřív zálohu níže.</p><label>Pro potvrzení zadej heslo<input type="password" name="current" autocomplete="current-password" required></label><div class="form-actions"><button type="submit" class="danger-button">Smazat natrvalo</button><button type="button" class="text-button" data-action="cancel-delete-account">Zpět</button></div></form>` : ''}</section>`;
  }
  function welcomePanel() {
    if (data.transactions.length) return '';
    return `<section class="panel welcome"><div><h2>Zatím tu nejsou žádné platby</h2><p class="field-help">Přidej první výdaj ručně, vlož výpis z bankovnictví, nebo nahraj zálohu z jiného zařízení.</p></div><div class="form-actions"><a class="primary-button" href="#/add">Přidat výdaj</a><button type="button" class="secondary-button" data-action="restore-backup">Obnovit ze zálohy</button></div></section>`;
  }
  function initCloud() {
    document.body.dataset.auth = 'loading';
    document.querySelectorAll('[data-auth-mode]').forEach(button => button.addEventListener('click', () => { $('authError').hidden = true; $('authInfo').hidden = true; setAuthMode(button.dataset.authMode); }));
    $('authForm').addEventListener('submit', async event => {
      event.preventDefault(); event.stopPropagation();
      const form = event.target, email = form.elements.email.value.trim(), password = form.elements.password.value;
      $('authError').hidden = true; $('authInfo').hidden = true;
      const fail = message => { $('authError').textContent = message; $('authError').hidden = false; };
      if (!email) { fail('Zadej e-mail.'); form.elements.email.focus(); return; }
      if (!password) { fail('Zadej heslo.'); form.elements.password.focus(); return; }
      if (authMode === 'up' && password.length < 8) { fail('Heslo musí mít aspoň 8 znaků.'); form.elements.password.focus(); return; }
      const submit = $('authSubmit'); submit.disabled = true; submit.textContent = authMode === 'in' ? 'Přihlašuji…' : 'Zakládám účet…';
      try { await (authMode === 'in' ? cloud.signIn(email, password) : cloud.signUp(email, password)); form.elements.password.value = ''; }
      catch (error) { fail(error.message); }
      submit.disabled = false; setAuthMode(authMode);
    });
    $('authForgot').addEventListener('click', async () => {
      const email = $('authForm').elements.email.value.trim();
      $('authError').hidden = true; $('authInfo').hidden = true;
      if (!email) { $('authError').textContent = 'Nejdřív nahoře vyplň e-mail, na který ti pošlu odkaz.'; $('authError').hidden = false; $('authForm').elements.email.focus(); return; }
      try { await cloud.resetPassword(email); $('authInfo').textContent = `Pokud účet ${email} existuje, přišel na něj e-mail s odkazem na nové heslo.`; $('authInfo').hidden = false; }
      catch (error) { $('authError').textContent = error.message; $('authError').hidden = false; }
    });
    cloud.onUser(user => { if (user) startSession(user); else showGate(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pullIfNewer(); else if (session && syncState !== 'saved') push(); });
    window.addEventListener('online', () => { if (session && syncState !== 'saved') push(); });
  }
  // ——— Porovnání dvou měsíců ———
  let compareA = null, compareB = null, compareMode = 'same-day', monthTarget = null;
  function monthKeyOf(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
  function monthName(key, withYear = true) {
    const [year, month] = key.split('-').map(Number);
    const text = withYear ? monthFormat.format(new Date(year, month - 1, 1)) : new Intl.DateTimeFormat('cs-CZ', { month: 'long' }).format(new Date(year, month - 1, 1));
    return text[0].toLocaleUpperCase('cs') + text.slice(1);
  }
  function monthsWithData() {
    const keys = new Set(data.transactions.map(row => row.date.slice(0, 7)));
    keys.add(currentMonth);
    return [...keys].sort().reverse();
  }
  function signedMoney(cents) { return `${cents > 0 ? '+' : cents < 0 ? '−' : ''}${wholeCrowns.format(Math.abs(cents) / 100)}`; }
  function changeChip(a, b) {
    const diff = a - b;
    if (!a && !b) return '';
    if (!b) return `<span class="change new">nově</span>`;
    if (Math.abs(diff) < 100) return `<span class="change same">beze změny</span>`;
    return `<span class="change ${diff > 0 ? 'up' : 'down'}">${uiIcon(diff > 0 ? 'up' : 'down')}${signedMoney(diff)}</span>`;
  }
  function compareChartMarkup(seriesA, seriesB, labelA, labelB, days) {
    const width = 640, height = 200, padLeft = 8, padRight = 8, padTop = 12, padBottom = 6;
    const max = Math.max(1, seriesA.at(-1) || 0, seriesB.at(-1) || 0);
    const x = day => padLeft + (width - padLeft - padRight) * (day - 1) / Math.max(1, days - 1);
    const y = value => padTop + (height - padTop - padBottom) * (1 - value / max);
    const path = series => series.map((value, index) => `${index ? 'L' : 'M'}${x(index + 1).toFixed(1)} ${y(value).toFixed(1)}`).join(' ');
    const grid = [0.25, 0.5, 0.75, 1].map(part => `<line x1="${padLeft}" x2="${width - padRight}" y1="${y(max * part).toFixed(1)}" y2="${y(max * part).toFixed(1)}"/>`).join('');
    const hits = Array.from({ length: days }, (_, index) => {
      const day = index + 1, a = seriesA[index], b = seriesB[index];
      const tip = `${day}. den|${labelA}: ${a === undefined ? '–' : wholeCrowns.format(a / 100)} · ${labelB}: ${b === undefined ? '–' : wholeCrowns.format(b / 100)}`;
      return `<rect class="cmp-hit" x="${(x(day) - (width / days) / 2).toFixed(1)}" y="0" width="${(width / days).toFixed(1)}" height="${height - padBottom}" data-tip="${escapeHtml(tip)}"/>`;
    }).join('');
    const ticks = [1, 5, 10, 15, 20, 25, days].filter((day, index, all) => all.indexOf(day) === index && (day === days || days - day > 2)).map(day => `<span style="left:${(100 * x(day) / width).toFixed(2)}%">${day}.</span>`).join('');
    const end = (series, cls) => series.length ? `<circle class="${cls}" cx="${x(series.length).toFixed(1)}" cy="${y(series.at(-1)).toFixed(1)}" r="4"/>` : '';
    return `<div class="cmp-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Průběžný součet útraty po dnech: ${escapeHtml(labelA)} ${wholeCrowns.format((seriesA.at(-1) || 0) / 100)}, ${escapeHtml(labelB)} ${wholeCrowns.format((seriesB.at(-1) || 0) / 100)}"><g class="cmp-grid">${grid}</g><g class="cmp-lines"><path class="cmp-b" d="${path(seriesB)}"/><path class="cmp-a" d="${path(seriesA)}"/>${end(seriesB, 'cmp-b-dot')}${end(seriesA, 'cmp-a-dot')}</g>${hits}</svg><div class="cmp-ticks" aria-hidden="true">${ticks}</div><div class="cmp-legend"><span><i class="cmp-key a"></i>${escapeHtml(labelA)}</span><span><i class="cmp-key b"></i>${escapeHtml(labelB)}</span></div></div>`;
  }
  function renderCompare() {
    const months = monthsWithData();
    if (!compareA || !months.includes(compareA)) compareA = selectedMonth && months.includes(selectedMonth) ? selectedMonth : currentMonth;
    if (!compareB || compareB === compareA) {
      const [year, month] = compareA.split('-').map(Number);
      compareB = monthKeyOf(new Date(year, month - 2, 1));
    }
    const daysIn = key => { const [year, month] = key.split('-').map(Number); return new Date(year, month, 0).getDate(); };
    const partial = [compareA, compareB].includes(currentMonth);
    const cutoff = partial && compareMode === 'same-day' ? today.getDate() : 31;
    const rowsOf = key => countedRows(data.transactions.filter(row => row.date.startsWith(key) && Number(row.date.slice(8, 10)) <= cutoff));
    const rowsA = rowsOf(compareA), rowsB = rowsOf(compareB);
    const totalA = sumCents(rowsA), totalB = sumCents(rowsB);
    const nameA = monthName(compareA), nameB = monthName(compareB);
    const shortA = monthName(compareA, compareA.slice(0, 4) !== compareB.slice(0, 4)), shortB = monthName(compareB, compareA.slice(0, 4) !== compareB.slice(0, 4));
    const days = Math.min(cutoff, Math.max(daysIn(compareA), daysIn(compareB)));
    const cumulative = (rows, key) => {
      const last = Math.min(cutoff, key === currentMonth ? today.getDate() : daysIn(key));
      const perDay = new Array(last).fill(0);
      rows.forEach(row => { const day = Number(row.date.slice(8, 10)); if (day <= last) perDay[day - 1] -= row.cents; });
      let sum = 0; return perDay.map(value => (sum += value));
    };
    const earliest = data.transactions.reduce((min, row) => row.date < min ? row.date : min, '9999');
    const gaps = [compareA, compareB].filter(key => !data.transactions.some(row => row.date.startsWith(key)) || (earliest.startsWith(key) && Number(earliest.slice(8, 10)) > 3));
    const gapNote = gaps.length ? `<div class="notice" role="status">${uiIcon('filter')}<span>${gaps.map(key => { const has = data.transactions.some(row => row.date.startsWith(key)); return has ? `${monthName(key)} je v datech až od ${Number(earliest.slice(8, 10))}. dne` : `${monthName(key)} nemá žádné platby`; }).join(', ')}. Srovnání proto není úplné.</span></div>` : '';
    const diff = totalA - totalB;
    const percent = totalB ? Math.round(Math.abs(diff) / totalB * 100) : null;
    const verdict = !totalA && !totalB ? 'V žádném z měsíců nejsou platby.' : !totalB ? `${shortB} je bez plateb.` : Math.abs(diff) < 100 ? 'Útrata je v obou měsících stejná.' : `${shortA}: o ${wholeCrowns.format(Math.abs(diff) / 100)} ${diff > 0 ? 'více' : 'méně'} (${percent} %) než ${shortB.toLocaleLowerCase('cs')}${partial && compareMode === 'same-day' ? `, počítáno k ${cutoff}. dni` : ''}.`;
    const side = (key, name, total, rows, cls) => `<div class="cmp-side ${cls}"><button type="button" class="month-button" data-action="pick-compare-month" data-value="${cls}" aria-label="${name}, změnit měsíc"><i class="cmp-key ${cls}" aria-hidden="true"></i><span>${escapeHtml(name)}</span>${uiIcon('chevron', 'chevron')}</button><strong class="hero-number" ${cls === 'a' ? `data-count="${total}"` : ''}>${moneyCents(total)}</strong><dl class="hero-facts"><div><dt>Plateb</dt><dd>${rows.length}</dd></div><div><dt>Průměrná platba</dt><dd>${rows.length ? wholeCrowns.format(total / rows.length / 100) : '–'}</dd></div><div><dt>Na den</dt><dd>${wholeCrowns.format(total / Math.max(1, Math.min(cutoff, key === currentMonth ? today.getDate() : daysIn(key))) / 100)}</dd></div></dl></div>`;
    const catA = new Map(totalsByCategory(rowsA)), catB = new Map(totalsByCategory(rowsB));
    const names = [...new Set([...catA.keys(), ...catB.keys()])].sort((x, y) => Math.max(catB.get(y) || 0, catA.get(y) || 0) - Math.max(catB.get(x) || 0, catA.get(x) || 0));
    const catMax = Math.max(1, ...names.map(name => Math.max(catA.get(name) || 0, catB.get(name) || 0)));
    const catRows = names.map((name, index) => { const a = catA.get(name) || 0, b = catB.get(name) || 0; return `<div class="cmp-row" style="--cat:${catColor(name)};--d:${index}" data-tip="${escapeHtml(name)}|${escapeHtml(shortA)}: ${moneyCents(a)} · ${escapeHtml(shortB)}: ${moneyCents(b)}"><span class="cat-icon">${categoryIcon(name)}</span><span class="cmp-name">${escapeHtml(name)}</span><span class="cmp-bars" aria-hidden="true"><span class="cmp-bar a"><i style="width:${(100 * a / catMax).toFixed(2)}%"></i></span><span class="cmp-bar b"><i style="width:${(100 * b / catMax).toFixed(2)}%"></i></span></span><span class="cmp-values"><strong>${wholeCrowns.format(a / 100)}</strong><span>${wholeCrowns.format(b / 100)}</span></span>${changeChip(a, b)}</div>`; }).join('') || '<p class="empty">V těchto měsících nejsou započítané výdaje.</p>';
    const moves = names.map(name => ({ name, diff: (catA.get(name) || 0) - (catB.get(name) || 0) })).filter(item => Math.abs(item.diff) >= 100);
    const moveList = (items, empty) => items.length ? items.map(item => `<div class="move-row" style="--cat:${catColor(item.name)}"><span class="cat-icon">${categoryIcon(item.name)}</span><span>${escapeHtml(item.name)}</span><strong class="${item.diff > 0 ? 'up' : 'down'}">${signedMoney(item.diff)}</strong></div>`).join('') : `<p class="empty">${empty}</p>`;
    const rose = moves.filter(item => item.diff > 0).sort((x, y) => y.diff - x.diff).slice(0, 4);
    const fell = moves.filter(item => item.diff < 0).sort((x, y) => x.diff - y.diff).slice(0, 4);
    const shops = new Map();
    const addShops = (rows, slot) => rows.forEach(row => { const id = logoId(row.description); if (!id) return; const item = shops.get(id) || { a: 0, b: 0 }; item[slot] -= row.cents; shops.set(id, item); });
    addShops(rowsA, 'a'); addShops(rowsB, 'b');
    const shopRows = [...shops].sort((x, y) => Math.max(y[1].a, y[1].b) - Math.max(x[1].a, x[1].b)).slice(0, 8).map(([id, item]) => `<div class="shop-row"><span class="brand-logo" aria-hidden="true">${logoImg(id)}</span><span class="cmp-name">${escapeHtml(logoNames[id])}</span><span class="cmp-values"><strong>${wholeCrowns.format(item.a / 100)}</strong><span>${wholeCrowns.format(item.b / 100)}</span></span>${changeChip(item.a, item.b)}</div>`).join('') || '<p class="empty">Žádné známé obchody.</p>';
    return `<div class="page-head"><h1>Porovnání</h1>${analysisTabs('compare')}</div>${gapNote}
      <section class="panel cmp-hero" aria-label="Porovnávané měsíce">
        <div class="cmp-sides">${side(compareA, nameA, totalA, rowsA, 'a')}<button type="button" class="icon-button swap-button" data-action="swap-compare" aria-label="Prohodit měsíce" data-tip="Prohodit měsíce">${uiIcon('swap')}</button>${side(compareB, nameB, totalB, rowsB, 'b')}</div>
        <div class="cmp-verdict"><p class="${diff > 100 ? 'up' : diff < -100 ? 'down' : ''}">${escapeHtml(verdict)}</p>${partial ? segmented('compare-mode', compareMode, [['same-day', `Ke stejnému dni`], ['full', 'Celé měsíce']], 'Způsob porovnání') : ''}</div>
      </section>
      <section class="panel"><div class="panel-head"><h2>Jak útrata během měsíce rostla</h2></div>${compareChartMarkup(cumulative(rowsA, compareA), cumulative(rowsB, compareB), shortA, shortB, days)}</section>
      <div class="two-col wide-first">
        <section class="panel"><div class="panel-head"><h2>Kategorie vedle sebe</h2><div class="cmp-legend small"><span><i class="cmp-key a"></i>${escapeHtml(shortA)}</span><span><i class="cmp-key b"></i>${escapeHtml(shortB)}</span></div></div><div class="cmp-list">${catRows}</div></section>
        <div class="stack"><section class="panel"><div class="panel-head"><h2>Kde přibylo</h2></div><div class="move-list">${moveList(rose, 'Nikde se neutratilo víc.')}</div></section><section class="panel"><div class="panel-head"><h2>Kde ubylo</h2></div><div class="move-list">${moveList(fell, 'Nikde se neutratilo míň.')}</div></section></div>
      </div>
      <section class="panel"><div class="panel-head"><h2>Obchody vedle sebe</h2><div class="cmp-legend small"><span><i class="cmp-key a"></i>${escapeHtml(shortA)}</span><span><i class="cmp-key b"></i>${escapeHtml(shortB)}</span></div></div><div class="shop-list">${shopRows}</div></section>`;
  }
  function analysisTabs(current) {
    return `<nav class="segmented page-tabs" aria-label="Části analýzy"><a href="#/analysis" ${current === 'analysis' ? 'aria-current="page"' : ''}>Období</a><a href="#/compare" ${current === 'compare' ? 'aria-current="page"' : ''}>Porovnání měsíců</a></nav>`;
  }
  function openMonthPicker(target) {
    monthTarget = target;
    const taken = target === 'a' ? compareB : compareA;
    $('monthChoices').innerHTML = monthsWithData().map(key => `<button type="button" class="choice-button" data-action="choose-month" data-value="${key}" aria-pressed="${key === (target === 'a' ? compareA : compareB)}" ${key === taken ? 'disabled' : ''}>${escapeHtml(monthName(key))}<small>${wholeCrowns.format(sumCents(data.transactions.filter(row => row.date.startsWith(key))) / 100)}</small></button>`).join('');
    $('monthDialog').showModal();
  }
  function categoryPickerButton(name, target = 'draft') {
    return `<button type="button" class="select-button" data-action="pick-category" data-id="${target}">${categoryIcon(name)}<span>${escapeHtml(name)}</span>${uiIcon('chevron', 'chevron')}</button>`;
  }
  function renderAdd() {
    const form = `<form id="manualForm" class="form-grid">
      <label>Částka v Kč<input type="text" name="amount" inputmode="decimal" placeholder="Např. 249,00" required></label>
      <label>Datum<input type="date" name="date" value="${new Date().toLocaleDateString('sv-SE')}" required></label>
      <label class="wide">Obchod nebo popis<input type="text" name="description" maxlength="160" placeholder="Např. Rohlík" list="merchantHints" autocomplete="off" required></label>
      <datalist id="merchantHints">${[...new Set(data.transactions.map(row => row.description))].slice(-60).map(name => `<option value="${escapeHtml(name)}"></option>`).join('')}</datalist>
      <div class="wide field-block"><span class="field-caption">Kategorie</span>${categoryPickerButton(draftCategory)}</div>
      <label class="wide">Poznámka<input type="text" name="note" maxlength="300" placeholder="Volitelné upřesnění"></label>
      <div class="form-actions"><button type="submit" class="primary-button">Uložit výdaj</button><span class="field-help">Platba se zařadí do měsíce podle data.</span></div>
    </form>`;
    const chosen = importPreview.filter(item => item.include).length;
    const preview = importPreview.length ? `<section class="panel"><div class="panel-head"><h2>Náhled importu</h2><span class="muted small">vybráno ${chosen} · vynechané příjmy: ${importSkippedIncome}</span></div><div class="preview-list">${importPreview.map((item, index) => `<div class="preview-row ${item.duplicate ? 'duplicate' : ''} ${item.include ? '' : 'off'}"><button type="button" class="include-button" data-action="toggle-import" data-index="${index}" aria-pressed="${item.include}" aria-label="${item.include ? 'Vynechat' : 'Zahrnout'} ${escapeHtml(item.description)}">${uiIcon('check')}</button><div class="tx-main"><span class="tx-name">${escapeHtml(item.description)}</span><span class="tx-meta"><span>${displayDate(item.date)}</span>${item.duplicate ? '<span>už je v evidenci</span>' : ''}</span></div><button type="button" class="chip-button" data-action="pick-import-category" data-index="${index}" style="--cat:${catColor(item.category)}"><i aria-hidden="true"></i><span>${escapeHtml(item.category)}</span></button><span class="tx-amount">${positiveMoney(item.cents)}</span></div>`).join('')}</div><div class="form-actions"><button type="button" class="primary-button" data-action="commit-import">Importovat vybrané (${chosen})</button><span class="field-help">Platby se stejným datem, popisem a částkou jsou předem vypnuté.</span></div></section>` : '';
    const importer = `<label class="field">Text výpisu<textarea id="importText" rows="10" placeholder="16. 11. 2026&#10;Apple.com&#10;-249,00 CZK">${escapeHtml(importRaw)}</textarea></label><div class="form-actions"><button type="button" class="primary-button" data-action="preview-import">Zkontrolovat import</button><label class="secondary-button file-button">Vybrat soubor<input id="importFile" type="file" accept=".csv,.tsv,.txt,text/plain,text/csv"></label></div>`;
    const lately = data.transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    const side = addTab === 'manual'
      ? `<section class="panel"><div class="panel-head"><h2>Poslední platby</h2><a class="inline-link" href="#/transactions">Všechny platby${uiIcon('right')}</a></div><div class="tx-list"><section class="day">${lately.map(row => transactionRow(row, false, true)).join('') || '<p class="empty">Zatím tu nic není.</p>'}</section></div></section>`
      : `<section class="panel"><div class="panel-head"><h2>Jak má výpis vypadat</h2></div><p class="field-help">Stačí zkopírovat pohyby z internetového bankovnictví, nebo nahrát soubor CSV, TSV či TXT se sloupci datum, popis a částka.</p><pre class="sample" aria-label="Ukázka výpisu">Datum;Popis;Částka
16.11.2026;Apple.com;-249,00
15.11.2026;Alza.cz;-109,00</pre><ul class="plain-list"><li>Berou se jen záporné částky, příjmy se přeskočí.</li><li>Platby, které už v evidenci jsou, se předem vypnou.</li><li>Kategorie se odhadne podle obchodu a jde před importem změnit.</li></ul></section>`;
    return `<div class="page-head"><h1>Přidat výdaj</h1></div><div class="two-col lead wide-first"><section class="panel form-panel">${segmented('add-tab', addTab, [['manual', 'Ruční zadání'], ['import', 'Import výpisu']], 'Způsob přidání')}${addTab === 'manual' ? form : importer}</section>${side}</div>${addTab === 'import' ? preview : ''}`;
  }
  // Rozbalovací sekce Nastavení si pamatují stav i po překreslení stránky.
  const openSections = new Set();
  function disclosure(id, title, meta, body) {
    return `<details class="panel disclosure" data-section="${id}" ${openSections.has(id) ? 'open' : ''}><summary class="disclosure-head"><h2>${title}</h2><span class="muted small">${meta}</span>${uiIcon('chevron', 'disclosure-chevron')}</summary><div class="disclosure-body">${body}</div></details>`;
  }
  function limitNoteText() {
    const limitSum = Object.values(data.categoryBudgets).reduce((sum, cents) => sum + cents, 0);
    if (!limitSum) return 'Ke každé kategorii můžeš zadat měsíční strop. Na Přehledu pak uvidíš, kolik z něj zbývá.';
    return `Limity kategorií dávají dohromady ${wholeCrowns.format(limitSum / 100)}${data.budgetCents ? (limitSum > data.budgetCents ? `, o ${wholeCrowns.format((limitSum - data.budgetCents) / 100)} víc než celkový měsíční limit.` : `, z celkového limitu ${wholeCrowns.format(data.budgetCents / 100)} zbývá ${wholeCrowns.format((data.budgetCents - limitSum) / 100)} na ostatní.`) : '.'}`;
  }
  function limitRowMarkup(item, spent) {
    const limit = data.categoryBudgets[item.name];
    const cents = spent.get(item.name) || 0;
    const share = limit ? cents / limit : 0;
    const meta = limit
      ? (share > 1 ? `<span class="over">přečerpáno o ${wholeCrowns.format((cents - limit) / 100)}</span>` : `${wholeCrowns.format(cents / 100)} z ${wholeCrowns.format(limit / 100)} · zbývá ${wholeCrowns.format((limit - cents) / 100)}`)
      : `tento měsíc ${wholeCrowns.format(cents / 100)}`;
    return `<div class="limit-row ${limit ? 'limited' : ''} ${share > 1 ? 'over' : ''}" data-limit-row="${escapeHtml(item.name)}" style="--cat:${catColor(item.name)}"><span class="cat-icon">${icon(item.icon)}</span><div class="manager-main"><span class="name">${escapeHtml(item.name)}</span><span class="meta">${meta}</span></div><label class="limit-field"><span class="visually-hidden">Měsíční limit pro ${escapeHtml(item.name)} v Kč</span><input type="text" inputmode="decimal" data-limit="${escapeHtml(item.name)}" value="${limit ? escapeHtml(String(limit / 100).replace('.', ',')) : ''}" placeholder="Bez limitu"><span aria-hidden="true">Kč</span></label>${limit ? `<span class="cat-track" aria-hidden="true"><i class="cat-fill" style="width:${Math.min(100, 100 * share).toFixed(1)}%"></i></span>` : ''}</div>`;
  }
  function monthSpendByCategory() { return new Map(totalsByCategory(data.transactions.filter(row => row.date.startsWith(currentMonth)))); }
  function renderLimits() {
    const spent = monthSpendByCategory();
    const total = sumCents(data.transactions.filter(row => row.date.startsWith(currentMonth)));
    const rows = data.categories.filter(item => item.name !== 'Nepočítá se').map(item => limitRowMarkup(item, spent)).join('');
    const month = monthLabel(currentMonth);
    const context = data.budgetCents
      ? `${month}: zatím ${wholeCrowns.format(total / 100)} z ${wholeCrowns.format(data.budgetCents / 100)}${total > data.budgetCents ? `, přečerpáno o ${wholeCrowns.format((total - data.budgetCents) / 100)}.` : `, zbývá ${wholeCrowns.format((data.budgetCents - total) / 100)}.`}`
      : `${month}: zatím ${wholeCrowns.format(total / 100)}. Strop, proti kterému se na Přehledu měří každý měsíc.`;
    return `<div class="page-head"><h1>Limity</h1><a class="inline-link page-back" href="#/categories">${uiIcon('left')}Nastavení</a></div>
      <section class="panel"><div class="panel-head"><h2>Měsíční limit</h2></div><p class="field-help">${context}</p>${budgetFormMarkup(true)}</section>
      <section class="panel"><div class="panel-head"><h2>Limity kategorií</h2><span class="muted small">${Object.keys(data.categoryBudgets).length} z ${data.categories.length - 1} nastaveno</span></div><p class="field-help" id="limitNote">${limitNoteText()}</p><div class="limit-list">${rows}</div></section>`;
  }
  function renderCategories() {
    const counts = new Map(data.categories.map(item => [item.name, 0]));
    data.transactions.forEach(row => counts.set(categoryName(row), (counts.get(categoryName(row)) || 0) + 1));
    const managers = data.categories.map(item => `<div class="manager-row" style="--cat:${catColor(item.name)}"><span class="cat-icon">${icon(item.icon)}</span><div class="manager-main"><span class="name">${escapeHtml(item.name)}</span><span class="meta">${counts.get(item.name)} ${countWord(counts.get(item.name))}</span></div><button type="button" class="icon-button" data-action="pick-icon" data-name="${escapeHtml(item.name)}" aria-label="Změnit ikonu kategorie ${escapeHtml(item.name)}" data-tip="Změnit ikonu">${icon('upravit')}</button>${!seed.baseCategories.includes(item.name) ? `<button type="button" class="icon-button danger" data-action="remove-category" data-name="${escapeHtml(item.name)}" aria-label="Smazat kategorii ${escapeHtml(item.name)}" data-tip="Smazat kategorii">${icon('smazat')}</button>` : '<span></span>'}</div>`).join('');
    const logos = Object.entries(logoNames).map(([id, name]) => `<div class="logo-tile"><span class="brand-logo" aria-hidden="true">${logoImg(id, true)}</span><span>${escapeHtml(name)}</span></div>`).join('');
    const unmatched = [...new Set(data.transactions.map(row => row.description))].filter(name => !logoId(name)).sort((a, b) => a.localeCompare(b, 'cs'));
    const customLogos = Object.keys(data.brandOverrides).length;
    const limitCount = Object.keys(data.categoryBudgets).length;
    const limitSummary = data.budgetCents ? `Měsíc ${wholeCrowns.format(data.budgetCents / 100)}` : 'Měsíční limit nenastaven';
    const missing = unmatched.filter(name => !data.brandOverrides[merchantKey(name)]).length;
    const categoryBody = `<div class="category-manager">${managers}</div><form id="newCategoryForm" class="new-category"><label class="field">Nová kategorie<input type="text" name="name" maxlength="40" placeholder="Název kategorie" required></label><button type="button" class="select-button" data-action="pick-icon" data-name="_draft">${icon(draftIcon)}<span>Vybrat ikonu</span></button><button type="submit" class="primary-button">Přidat kategorii</button></form>`;
    const logoBody = `<p class="field-help">Známé značky se přiřadí samy podle názvu platby. K ostatním můžeš nahrát vlastní obrázek.</p><h3 class="sub-head">Platby bez loga</h3><div class="unmatched-list">${unmatched.map(name => `<button type="button" class="choice-button" data-action="upload-logo" data-name="${escapeHtml(name)}">${uiIcon(data.brandOverrides[merchantKey(name)] ? 'check' : 'plus')}${escapeHtml(name)}</button>`).join('') || '<span class="field-help">Všechny platby mají logo.</span>'}</div><h3 class="sub-head">Připravená loga</h3><div class="logos-grid">${logos}</div>`;
    return `<div class="page-head"><h1>Nastavení</h1></div>
      <a class="panel link-panel" href="#/limits"><span class="link-panel-text"><h2>Limity</h2><span class="field-help">${limitSummary} · ${limitCount ? `${limitCount} ${limitCount === 1 ? 'kategorie' : limitCount < 5 ? 'kategorie' : 'kategorií'} s limitem` : 'kategorie bez limitů'}</span></span>${uiIcon('right', 'link-panel-arrow')}</a>
      ${disclosure('looks', 'Vzhled', `<span class="current-wallpaper"><i style="background-image:url(assets/bg/${currentWallpaper().id}-nahled.webp)"></i>${escapeHtml(currentWallpaper().name)} · ${wallpapers.length} tapet</span>`, `<p class="field-help">Barva a vzor pod sklem. Mění se v celé aplikaci.</p><div class="wallpaper-grid" role="radiogroup" aria-label="Tapeta">${wallpaperButtons(true)}</div>`)}
      ${disclosure('categories', 'Kategorie', `${data.categories.length} kategorií`, categoryBody)}
      ${disclosure('logos', 'Loga obchodů', `${Object.keys(logoNames).length + customLogos} log${missing ? ` · ${missing} bez loga` : ''}`, logoBody)}
      ${accountPanel()}
      <section class="panel"><div class="panel-head"><h2>Data a záloha</h2></div><p class="field-help">${session ? 'Data jsou uložená v tvém účtu. Záloha v souboru se hodí pro přenos z jiné instalace nebo jako pojistka.' : 'Všechno se ukládá jen v tomto prohlížeči. Zálohu si stáhni před vymazáním dat prohlížeče nebo přechodem na jiné zařízení.'}</p><div class="form-actions"><button type="button" class="secondary-button" data-action="download-backup">Stáhnout zálohu JSON</button><button type="button" class="secondary-button" data-action="restore-backup">Obnovit ze zálohy</button></div></section>`;
  }
  function makeId() { return globalThis.crypto?.randomUUID?.() || `new-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function parseBankDate(raw) {
    const match = String(raw).replace(/\\\./g, '.').match(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\b/);
    if (!match) return null;
    const iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    return dateObject(iso).toISOString().slice(0, 10) === iso ? iso : null;
  }
  function signedAmount(raw) {
    const match = String(raw).match(/[-−+]?\s*\d[\d\s\u00a0\u2009\u202f]*[,.]\d{1,2}\s*(?:CZK|Kč)?/i);
    if (!match) return null;
    const negative = /^\s*[-−]/.test(match[0]);
    const positive = /^\s*\+/.test(match[0]);
    const cents = parseCents(match[0]);
    return cents === null ? null : { cents: negative ? -cents : cents, explicit: negative || positive };
  }
  function csvCells(line, delimiter) {
    const cells = []; let current = ''; let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && quoted && line[i + 1] === '"') { current += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if (char === delimiter && !quoted) { cells.push(current.trim()); current = ''; }
      else current += char;
    }
    cells.push(current.trim()); return cells;
  }
  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    const delimiter = [';', '\t', ','].sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0];
    const headers = csvCells(lines[0], delimiter).map(normalize);
    const field = terms => headers.findIndex(header => terms.some(term => header.includes(term)));
    const date = field(['datum', 'date']), desc = field(['popis', 'description', 'obchod', 'merchant', 'prijemce', 'protistrana']), amount = field(['castka', 'amount', 'suma']);
    if ([date, desc, amount].some(index => index < 0)) return [];
    return lines.slice(1).map(line => {
      const cells = csvCells(line, delimiter);
      const iso = /^\d{4}-\d\d-\d\d$/.test(cells[date]) ? cells[date] : parseBankDate(cells[date]);
      const raw = cells[amount]?.replace(/\s/g, '');
      const cents = parseCents(raw);
      if (!iso || !cells[desc]?.trim() || cents === null) return null;
      return { date: iso, description: cells[desc].trim(), cents: /^[-−]/.test(raw) ? -cents : cents };
    }).filter(Boolean);
  }
  function parseBankText(raw) {
    const lines = raw.split(/\r?\n/).map(line => line.trim().replace(/\\\./g, '.')).filter(Boolean);
    const entries = []; let date = null; let description = '';
    for (const line of lines) {
      const maybeDate = parseBankDate(line);
      if (maybeDate && line.length < 30) { date = maybeDate; description = ''; continue; }
      if (!date || /^(typ|datum|popis|kategorie|částka|více|změna kategorie|platba kartou|převod|předplatné|nezaúčtováno)$/i.test(line)) continue;
      const amount = signedAmount(line);
      if (amount && description && (amount.explicit || /CZK|Kč/i.test(line))) {
        entries.push({ date, description, cents: amount.cents });
        date = null; description = '';
      } else if (!amount && line.length > 2) description = line;
    }
    return entries;
  }
  function prepareImport(raw) {
    importRaw = raw;
    const parsed = parseCsv(raw).length ? parseCsv(raw) : parseBankText(raw);
    importSkippedIncome = parsed.filter(item => item.cents >= 0).length;
    const existing = new Set(data.transactions.map(row => `${row.date}|${normalize(row.description)}|${row.cents}`));
    const seen = new Set();
    importPreview = parsed.filter(item => item.cents < 0).map(item => {
      const key = `${item.date}|${normalize(item.description)}|${item.cents}`;
      const duplicate = existing.has(key) || seen.has(key);
      seen.add(key);
      return { ...item, category: inferredCategory(item.description), duplicate, include: !duplicate };
    });
    if (!parsed.length) toast('Nepodařilo se najít platby. Zkontrolujte formát výpisu.');
    else toast(`Nalezeno ${importPreview.length} výdajů.`);
    render();
  }
  function inferredCategory(description) {
    const existing = data.transactions.find(row => merchantKey(row.description) === merchantKey(description));
    if (existing) return categoryName(existing);
    const id = logoId(description);
    if (['albert','billa','rohlik','kaufland','globus','wolt','aluha','sunny'].includes(id)) return 'Jídlo';
    if (['ono','eurooil'].includes(id)) return 'Benzín';
    if (id === 'pid') return 'Parkování';
    if (['apple','adobe','anthropic','openai'].includes(id)) return 'Předplatné';
    if (id === 'alza') return 'Elektronika';
    if (['dm','rossmann'].includes(id)) return 'Drogerie';
    if (['playlive','utenisu'].includes(id)) return 'Zábava';
    if (['action','bb'].includes(id)) return 'Rozmar';
    return 'Nezařazeno';
  }
  let lastRoute = null;
  let animateNext = true;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function render() {
    renderShell();
    const page = route();
    const content = $('appContent');
    hideTip();
    content.innerHTML = page === 'transactions' ? renderTransactions() : page === 'analysis' ? renderAnalysis() : page === 'compare' ? renderCompare() : page === 'add' ? renderAdd() : page === 'limits' ? renderLimits() : page === 'categories' ? renderCategories() : renderOverview();
    if (page === 'transactions') renderTransactionResults();
    if (lastRoute !== null && lastRoute !== page) window.scrollTo(0, 0);
    const enter = animateNext || lastRoute !== page;
    animateNext = false;
    lastRoute = page;
    closeCalendar();
    enhanceDates(content);
    setupScrollers();
    if (enter && !reducedMotion.matches) armReveal(content);
  }
  function countUp(node) {
    const target = Number(node.dataset.count);
    if (!target) return;
    const start = performance.now();
    const step = now => {
      if (!node.isConnected) return;
      const progress = Math.min(1, (now - start) / 700);
      node.textContent = moneyCents(Math.round(target * (1 - Math.pow(1 - progress, 4))));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // Posuvné řádky (kategorie, karusel): šipky, kolečko myši, tažení a ztmavení jen na straně, kde je co dál.
  function setupScrollers() {
    document.querySelectorAll('[data-scroller]').forEach(wrap => {
      const track = wrap.querySelector('[data-track]');
      const previous = wrap.querySelector('[data-scroll="-1"]'), next = wrap.querySelector('[data-scroll="1"]');
      const sync = () => {
        const max = track.scrollWidth - track.clientWidth;
        const atStart = track.scrollLeft <= 4, atEnd = track.scrollLeft >= max - 4;
        wrap.classList.toggle('can-scroll', max > 4);
        track.classList.toggle('fade-start', !atStart);
        track.classList.toggle('fade-end', !atEnd && max > 4);
        if (wrap.dataset.scroller === 'hide') { previous.hidden = atStart; next.hidden = atEnd || max <= 4; }
        else { previous.disabled = atStart; next.disabled = atEnd; }
      };
      wrap.syncScroller = sync;
      if (!track.dataset.ready) {
        track.dataset.ready = '1';
        track.addEventListener('scroll', sync, { passive: true });
        track.addEventListener('wheel', event => {
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || track.scrollWidth <= track.clientWidth) return;
          const before = track.scrollLeft;
          track.scrollLeft += event.deltaY;
          if (track.scrollLeft !== before) event.preventDefault();
        }, { passive: false });
        let drag = null;
        track.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse' && event.button === 0) drag = { x: event.clientX, left: track.scrollLeft, moved: false }; });
        window.addEventListener('pointermove', event => {
          if (!drag) return;
          const delta = event.clientX - drag.x;
          if (!drag.moved && Math.abs(delta) < 6) return;
          drag.moved = true; track.classList.add('dragging'); track.scrollLeft = drag.left - delta;
        });
        window.addEventListener('pointerup', () => { if (!drag) return; const moved = drag.moved; drag = null; track.classList.remove('dragging'); if (moved) track.addEventListener('click', event => { event.stopPropagation(); event.preventDefault(); }, { capture: true, once: true }); });
        new ResizeObserver(sync).observe(track);
      }
      sync();
    });
  }
  // Panely se rozehrají, až když na ně dojde při scrollování.
  const revealer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      revealer.unobserve(entry.target);
      entry.target.classList.add('in');
      entry.target.querySelectorAll('[data-count]').forEach(countUp);
      entry.target.addEventListener('animationend', event => { if (event.target === entry.target) entry.target.removeAttribute('data-reveal'); }, { once: true });
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
  function armReveal(content) {
    if (!revealer) return;
    revealer.disconnect();
    let visibleIndex = 0;
    content.querySelectorAll(':scope > .panel, :scope > .two-col > .panel, :scope > .two-col > .stack > .panel, :scope > .notice').forEach(node => {
      const onScreen = node.getBoundingClientRect().top < window.innerHeight;
      node.style.setProperty('--i', onScreen ? visibleIndex++ : 0);
      node.setAttribute('data-reveal', '');
      node.classList.remove('in');
      revealer.observe(node);
    });
  }

  // Vlastní kalendář místo systémového (jen s myší; na dotykových zařízeních zůstává nativní výběr data).
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const calendar = document.createElement('div');
  calendar.className = 'calendar'; calendar.setAttribute('role', 'dialog'); calendar.setAttribute('aria-label', 'Výběr data');
  if ('popover' in HTMLElement.prototype) calendar.setAttribute('popover', 'manual'); else calendar.hidden = true;
  let calendarInput = null, calendarMonth = null;
  const isoOf = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  function enhanceDates(root = document) {
    if (!finePointer.matches) return;
    root.querySelectorAll('input[type="date"]:not([data-enhanced])').forEach(input => {
      input.dataset.enhanced = '1';
      const wrap = document.createElement('span');
      wrap.className = 'date-field';
      input.replaceWith(wrap);
      wrap.append(input);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'date-trigger'; button.setAttribute('aria-label', 'Otevřít kalendář'); button.setAttribute('aria-haspopup', 'dialog');
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4m8-4v4"/></svg>';
      wrap.append(button);
    });
  }
  function calendarOpen() { return calendarInput !== null; }
  function closeCalendar(refocus = false) {
    if (!calendarOpen()) return;
    const input = calendarInput;
    calendarInput = null;
    if (calendar.matches?.(':popover-open')) calendar.hidePopover(); else calendar.hidden = true;
    if (refocus) input.parentElement.querySelector('.date-trigger')?.focus();
  }
  function drawCalendar(focusIso) {
    const [year, month] = calendarMonth;
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const todayIso = isoOf(new Date());
    const selected = calendarInput.value;
    const title = monthFormat.format(first);
    let cells = '';
    for (let index = 0; index < 42; index++) {
      const date = new Date(year, month, index - offset + 1);
      const iso = isoOf(date);
      cells += `<button type="button" class="cal-day ${date.getMonth() === month ? '' : 'other'} ${iso === todayIso ? 'today' : ''}" data-day="${iso}" aria-pressed="${iso === selected}" aria-label="${dayLong.format(date)} ${date.getFullYear()}" tabindex="${iso === (focusIso || selected || todayIso) ? 0 : -1}">${date.getDate()}</button>`;
    }
    calendar.innerHTML = `<div class="cal-head"><button type="button" class="icon-button" data-cal="-1" aria-label="Předchozí měsíc">${uiIcon('left')}</button><strong aria-live="polite">${title[0].toLocaleUpperCase('cs') + title.slice(1)}</strong><button type="button" class="icon-button" data-cal="1" aria-label="Další měsíc">${uiIcon('right')}</button></div><div class="cal-week" aria-hidden="true">${['po', 'út', 'st', 'čt', 'pá', 'so', 'ne'].map(day => `<span>${day}</span>`).join('')}</div><div class="cal-grid">${cells}</div><div class="cal-foot"><button type="button" class="text-button" data-day="${todayIso}">Dnes</button>${calendarInput.required ? '' : '<button type="button" class="text-button" data-day="">Vymazat</button>'}</div>`;
    if (focusIso) calendar.querySelector(`.cal-grid [data-day="${focusIso}"]`)?.focus();
  }
  function openCalendar(input) {
    closeCalendar();
    calendarInput = input;
    const base = input.value ? dateObject(input.value) : new Date();
    calendarMonth = input.value ? [base.getUTCFullYear(), base.getUTCMonth()] : [base.getFullYear(), base.getMonth()];
    (input.closest('dialog') || document.body).append(calendar);
    drawCalendar();
    if (calendar.showPopover) calendar.showPopover(); else calendar.hidden = false;
    const rect = input.getBoundingClientRect();
    const width = calendar.offsetWidth, height = calendar.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left));
    const top = rect.bottom + 8 + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 8) : rect.bottom + 8;
    calendar.style.left = `${Math.round(left)}px`; calendar.style.top = `${Math.round(top)}px`;
    (calendar.querySelector('.cal-grid [tabindex="0"]') || calendar.querySelector('.cal-day')).focus({ preventScroll: true });
  }
  calendar.addEventListener('click', event => {
    const step = event.target.closest('[data-cal]');
    if (step) { const date = new Date(calendarMonth[0], calendarMonth[1] + Number(step.dataset.cal), 1); calendarMonth = [date.getFullYear(), date.getMonth()]; drawCalendar(); calendar.querySelector(`[data-cal="${step.dataset.cal}"]`).focus(); return; }
    const day = event.target.closest('[data-day]');
    if (!day) return;
    const input = calendarInput;
    input.value = day.dataset.day;
    closeCalendar(true);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  calendar.addEventListener('keydown', event => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeCalendar(true); return; }
    const current = event.target.closest('.cal-grid [data-day]');
    if (!current || !(event.key in moves)) return;
    event.preventDefault();
    const date = dateObject(current.dataset.day);
    date.setUTCDate(date.getUTCDate() + moves[event.key]);
    const iso = date.toISOString().slice(0, 10);
    calendarMonth = [date.getUTCFullYear(), date.getUTCMonth()];
    drawCalendar(iso);
  });
  document.addEventListener('click', event => {
    const trigger = event.target.closest('.date-trigger');
    if (trigger) { const input = trigger.parentElement.querySelector('input'); if (calendarInput === input) closeCalendar(); else openCalendar(input); }
  });
  document.addEventListener('pointerdown', event => { if (calendarOpen() && !calendar.contains(event.target) && !event.target.closest('.date-trigger')) closeCalendar(); }, true);
  document.addEventListener('cancel', event => { if (calendarOpen()) { event.preventDefault(); closeCalendar(true); } }, true);
  document.addEventListener('close', () => closeCalendar(), true);
  window.addEventListener('resize', () => closeCalendar());
  function openCategoryPicker(target) {
    categoryTarget = target;
    $('categoryChoices').innerHTML = data.categories.map(item => `<button type="button" class="choice-button" data-action="choose-category" data-value="${escapeHtml(item.name)}" style="--cat:${catColor(item.name)}">${icon(item.icon)}${escapeHtml(item.name)}</button>`).join('');
    $('categoryDialog').showModal();
  }
  function openIconPicker(target) {
    iconTarget = target;
    $('iconChoices').innerHTML = iconNames.map(name => `<button type="button" class="choice-button" data-action="choose-icon" data-value="${escapeHtml(name)}">${icon(name)}${escapeHtml(name)}</button>`).join('');
    $('iconDialog').showModal();
  }
  function editCategoryLabel() {
    if (!editTarget) return;
    const cat = categoryName(editTarget);
    $('editCategory').dataset.id = editTarget.id;
    $('editCategory').innerHTML = `${categoryIcon(cat)}<span>${escapeHtml(cat)}</span>${uiIcon('chevron', 'chevron')}`;
  }
  function setWallpaper(id) {
    if (!wallpapers.some(item => item.id === id) || data.wallpaper === id) return;
    const apply = () => { data.wallpaper = id; save(); render(); };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(apply);
    else apply();
  }
  function downloadBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `vydaje-zaloha-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  // Jedna společná bublina pro všechny grafy a ikony: prvek s data-tip="Název|Hodnota".
  const tipNode = document.createElement('div');
  tipNode.className = 'tip'; tipNode.hidden = true; tipNode.setAttribute('role', 'tooltip');
  document.body.appendChild(tipNode);
  let tipTimer;
  function hideTip() { tipNode.hidden = true; }
  function showTip(target, x, y) {
    const [title, value] = target.dataset.tip.split('|');
    tipNode.innerHTML = value ? `<span>${escapeHtml(title)}</span><strong>${escapeHtml(value)}</strong>` : `<span>${escapeHtml(title)}</span>`;
    tipNode.hidden = false;
    const width = tipNode.offsetWidth, height = tipNode.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, x - width / 2));
    const top = y - height - 14 < 8 ? y + 20 : y - height - 14;
    tipNode.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const target = event.target.closest?.('[data-tip]');
    if (target) showTip(target, event.clientX, event.clientY); else hideTip();
  });
  document.addEventListener('pointerdown', event => {
    const target = event.target.closest?.('[data-tip]');
    if (!target) { hideTip(); return; }
    if (event.pointerType !== 'touch') return;
    const rect = target.getBoundingClientRect();
    showTip(target, rect.left + rect.width / 2, rect.top);
    clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 2400);
  });
  document.addEventListener('pointerleave', hideTip);
  document.addEventListener('focusin', event => {
    const target = event.target.closest?.('[data-tip]');
    if (!target || !event.target.matches(':focus-visible')) return;
    const rect = target.getBoundingClientRect();
    showTip(target, rect.left + rect.width / 2, rect.top);
  });
  document.addEventListener('focusout', hideTip);
  window.addEventListener('scroll', hideTip, { passive: true, capture: true });
  function deleteRow(id, fromDialog = false) {
    const row = data.transactions.find(item => item.id === id);
    if (!row || !confirm(`Smazat výdaj ${row.description} (${displayDate(row.date)}, ${positiveMoney(row.cents)})?`)) return;
    data.transactions = data.transactions.filter(item => item.id !== id);
    if (fromDialog) $('editDialog').close();
    if (editTarget?.id === id) editTarget = null;
    save(); render(); toast('Výdaj byl smazán.');
  }
  document.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches?.('[role="button"][data-action]')) { event.preventDefault(); event.target.click(); }
  });
  document.addEventListener('click', event => {
    const close = event.target.closest('[data-close-dialog]');
    if (close) { $(close.dataset.closeDialog).close(); return; }
    if (event.target.matches?.('dialog')) { event.target.close(); return; }
    const scrollButton = event.target.closest('[data-scroll]');
    if (scrollButton) { const track = scrollButton.closest('[data-scroller]').querySelector('[data-track]'); track.scrollBy({ left: Number(scrollButton.dataset.scroll) * Math.max(200, track.clientWidth * 0.7), behavior: reducedMotion.matches ? 'auto' : 'smooth' }); return; }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, value, id, name, index } = button.dataset;
    if (action === 'filter-category') { filters.category = value; refreshTransactions(); }
    else if (action === 'filter-counting') { filters.counting = value; refreshTransactions(); }
    else if (action === 'sort') { filters.sort = value; refreshTransactions(); }
    else if (action === 'open-day') { if (!filters.from && !filters.to) periodBeforeRange = selectedMonth; selectedMonth = null; filters.from = value; filters.to = value; filters.category = ''; location.hash = '#/transactions'; render(); }
    else if (action === 'select-month') { selectedMonth = value; periodBeforeRange = value; filters.from = ''; filters.to = ''; animateNext = true; render(); }
    else if (action === 'toggle-filters') { filtersOpen = !filtersOpen; render(); }
    else if (action === 'clear-filters') { if (filters.from || filters.to) selectedMonth = periodBeforeRange; resetFilters(); render(); }
    else if (action === 'clear-content-filters') { const { from, to, sort } = filters; resetFilters(); Object.assign(filters, { from, to, sort }); render(); }
    else if (action === 'open-category') { filters.category = value; filters.counting = 'all'; location.hash = '#/transactions'; render(); }
    else if (action === 'set-wallpaper') setWallpaper(value);
    else if (action === 'sign-out') { (async () => { if (syncState !== 'saved') await push(); const key = storageKey; try { await cloud.signOut(); localStorage.removeItem(key); localStorage.removeItem(`${key}:synced`); } catch (error) { toast(error.message); } })(); }
    else if (action === 'ask-delete-account') { accountDeleting = true; render(); document.querySelector('#deleteAccountForm input')?.focus(); }
    else if (action === 'cancel-delete-account') { accountDeleting = false; render(); }
    else if (action === 'pick-compare-month') openMonthPicker(value);
    else if (action === 'choose-month') { if (monthTarget === 'a') compareA = value; else compareB = value; $('monthDialog').close(); animateNext = true; render(); }
    else if (action === 'swap-compare') { [compareA, compareB] = [compareB, compareA]; animateNext = true; render(); }
    else if (action === 'compare-mode') { compareMode = value; animateNext = true; render(); }
    else if (action === 'edit-budget') { budgetEditing = true; render(); document.querySelector('#budgetForm input')?.focus(); }
    else if (action === 'cancel-budget') { budgetEditing = false; render(); }
    else if (action === 'clear-budget') { data.budgetCents = null; budgetEditing = false; save(); render(); toast('Měsíční limit je zrušený.'); }
    else if (action === 'add-tab') { addTab = value; render(); }
    else if (action === 'pick-category') openCategoryPicker(id === 'draft' ? { type: 'draft' } : { type: 'transaction', id });
    else if (action === 'pick-import-category') openCategoryPicker({ type: 'import', index: Number(index) });
    else if (action === 'choose-category') {
      if (categoryTarget?.type === 'draft') {
        draftCategory = value;
        const draftButton = document.querySelector('#manualForm [data-action="pick-category"]');
        if (draftButton) draftButton.innerHTML = `${categoryIcon(value)}<span>${escapeHtml(value)}</span>${uiIcon('chevron', 'chevron')}`;
      }
      else if (categoryTarget?.type === 'transaction') {
        const row = data.transactions.find(item => item.id === categoryTarget.id);
        if (row) { row.category = value; save(); }
      }
      else if (categoryTarget?.type === 'import') importPreview[categoryTarget.index].category = value;
      $('categoryDialog').close(); if (categoryTarget?.type !== 'draft') render();
      if ($('editDialog').open) editCategoryLabel();
    }
    else if (action === 'pick-icon') openIconPicker(name === '_draft' ? { type: 'draft' } : { type: 'category', name });
    else if (action === 'choose-icon') {
      if (iconTarget?.type === 'draft') {
        draftIcon = value;
        const draftButton = document.querySelector('#newCategoryForm [data-action="pick-icon"]');
        if (draftButton) draftButton.innerHTML = `${icon(value)}<span>Vybrat ikonu</span>`;
      }
      else if (iconTarget?.type === 'category') { const item = category(iconTarget.name); if (item) { item.icon = value; save(); } }
      $('iconDialog').close(); if (iconTarget?.type !== 'draft') render();
    }
    else if (action === 'edit') {
      editTarget = data.transactions.find(item => item.id === id);
      if (!editTarget) return;
      const form = $('editForm');
      form.elements.date.value = editTarget.date;
      form.elements.amount.value = (Math.abs(editTarget.cents) / 100).toFixed(2).replace('.', ',');
      form.elements.description.value = editTarget.description;
      form.elements.note.value = editTarget.note || '';
      editCategoryLabel();
      $('editDialog').showModal();
    }
    else if (action === 'preview-import') prepareImport($('importText').value);
    else if (action === 'toggle-import') { importPreview[Number(index)].include = !importPreview[Number(index)].include; render(); }
    else if (action === 'commit-import') {
      const chosen = importPreview.filter(item => item.include);
      if (!chosen.length) { toast('Nejdřív vyber platby k importu.'); return; }
      chosen.forEach(item => data.transactions.push({ id: makeId(), date: item.date, description: item.description, cents: item.cents, category: item.category, note: '', source: 'import' }));
      save(); importPreview = []; importRaw = ''; selectedMonth = chosen[0].date.slice(0, 7); periodBeforeRange = selectedMonth; resetFilters(); location.hash = '#/transactions'; render(); toast(`Importováno: ${chosen.length} ${countWord(chosen.length)}.`);
    }
    else if (action === 'remove-category') {
      if (!confirm(`Smazat kategorii ${name}? Její platby se přesunou do Nezařazeno.`)) return;
      data.transactions.forEach(row => { if (row.category === name) row.category = 'Nezařazeno'; });
      data.categories = data.categories.filter(item => item.name !== name); delete data.categoryBudgets[name]; if (filters.category === name) filters.category = ''; save(); render();
    }
    else if (action === 'upload-logo') { logoTarget = name; $('customLogoInput').click(); }
    else if (action === 'download-backup') downloadBackup();
    else if (action === 'restore-backup') $('restoreInput').click();
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'importText') importRaw = event.target.value;
    const filter = event.target.dataset.filter;
    if (filter) {
      if ((filter === 'from' || filter === 'to') && !filters.from && !filters.to) periodBeforeRange = selectedMonth;
      filters[filter] = event.target.value;
      if (filter === 'from' || filter === 'to') { selectedMonth = (filters.from || filters.to) ? null : periodBeforeRange; renderShell(); }
      renderTransactionResults();
    }
  });
  document.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    if (form.id === 'manualForm') {
      const values = new FormData(form); const cents = parseCents(values.get('amount'));
      if (!cents || cents <= 0) { toast('Zadej platnou částku větší než nula.'); form.elements.amount.focus(); return; }
      const date = values.get('date'); const description = String(values.get('description') || '').trim();
      if (!date || !description) return;
      data.transactions.push({ id: makeId(), date, description, cents: -cents, category: draftCategory, note: String(values.get('note') || '').trim(), source: 'ručně' });
      selectedMonth = date.slice(0, 7); periodBeforeRange = selectedMonth; resetFilters(); save(); location.hash = '#/transactions'; render(); toast('Výdaj je uložený.');
    } else if (form.id === 'passwordForm') {
      const values = new FormData(form); const next = String(values.get('next') || '');
      if (next.length < 8) { toast('Nové heslo musí mít aspoň 8 znaků.'); form.elements.next.focus(); return; }
      const button = form.querySelector('button[type="submit"]'); button.disabled = true;
      cloud.changePassword(String(values.get('current') || ''), next).then(() => { form.reset(); toast('Heslo je změněné.'); }).catch(error => toast(error.message)).finally(() => { button.disabled = false; });
    } else if (form.id === 'deleteAccountForm') {
      const button = form.querySelector('button[type="submit"]'); button.disabled = true;
      const key = storageKey, chunks = session.chunks;
      clearTimeout(pushTimer);
      cloud.deleteAccount(String(new FormData(form).get('current') || ''), chunks).then(() => { localStorage.removeItem(key); localStorage.removeItem(`${key}:synced`); accountDeleting = false; toast('Účet i data jsou smazané.'); }).catch(error => { toast(error.message); button.disabled = false; });
    } else if (form.id === 'budgetForm') {
      const cents = parseCents(new FormData(form).get('budget'));
      if (!cents || cents <= 0) { toast('Zadej limit jako částku větší než nula, třeba 25 000.'); form.elements.budget.focus(); return; }
      data.budgetCents = cents; budgetEditing = false; save(); render(); toast(`Měsíční limit je ${wholeCrowns.format(cents / 100)}.`);
    } else if (form.id === 'periodForm') {
      const values = new FormData(form);
      const from = String(values.get('from') || ''), to = String(values.get('to') || '');
      if (!from || !to || from > to) { toast('Datum „Od“ musí být před datem „Do“.'); return; }
      if (!filters.from && !filters.to) periodBeforeRange = selectedMonth;
      selectedMonth = null; filters.from = from; filters.to = to;
      $('periodDialog').close(); animateNext = true; render();
    } else if (form.id === 'newCategoryForm') {
      const name = String(new FormData(form).get('name') || '').trim();
      if (!name) return;
      if (data.categories.some(item => normalize(item.name) === normalize(name))) { toast('Tahle kategorie už existuje.'); return; }
      data.categories.push({ name, icon: draftIcon }); save(); render(); toast('Kategorie je přidaná.');
    } else if (form.id === 'editForm' && editTarget) {
      const values = new FormData(form); const cents = parseCents(values.get('amount'));
      if (!cents || cents <= 0) { toast('Zadej platnou částku větší než nula.'); return; }
      editTarget.date = values.get('date'); editTarget.cents = -cents; editTarget.description = String(values.get('description') || '').trim(); editTarget.note = String(values.get('note') || '').trim();
      save(); $('editDialog').close(); render(); toast('Výdaj je upravený.');
    }
  });
  $('deleteTransaction').addEventListener('click', () => {
    if (editTarget) deleteRow(editTarget.id, true);
  });
  // Kliknutí myší na hlavičku rozbalovací sekce ji nemá zaměřit (jinak zůstane rámeček); klávesnice dál funguje.
  document.addEventListener('mousedown', event => { if (event.target.closest?.('.disclosure-head')) event.preventDefault(); });
  document.addEventListener('toggle', event => { const id = event.target.dataset?.section; if (id) { if (event.target.open) openSections.add(id); else openSections.delete(id); } }, true);
  document.addEventListener('change', async event => {
    const limitName = event.target.dataset?.limit;
    if (limitName) {
      const raw = event.target.value.trim();
      const cents = raw ? parseCents(raw) : null;
      if (raw && (!cents || cents <= 0)) { toast('Limit zadej jako částku větší než nula, nebo pole nech prázdné.'); event.target.value = data.categoryBudgets[limitName] ? String(data.categoryBudgets[limitName] / 100).replace('.', ',') : ''; return; }
      if (cents) data.categoryBudgets[limitName] = cents; else delete data.categoryBudgets[limitName];
      save();
      const note = document.getElementById('limitNote');
      if (note) note.textContent = limitNoteText();
      const row = [...document.querySelectorAll('[data-limit-row]')].find(node => node.dataset.limitRow === limitName);
      const item = data.categories.find(entry => entry.name === limitName);
      if (row && item) { const fresh = document.createElement('div'); fresh.innerHTML = limitRowMarkup(item, monthSpendByCategory()); row.replaceWith(fresh.firstElementChild); }
      toast(cents ? `Limit pro ${limitName}: ${wholeCrowns.format(cents / 100)} měsíčně.` : `Limit pro ${limitName} je zrušený.`);
      return;
    }
    if (event.target.id === 'importFile') {
      const file = event.target.files?.[0]; if (!file) return;
      const raw = await file.text(); prepareImport(raw);
    }
  });
  $('customLogoInput').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file || !logoTarget) return;
    try {
      const bitmap = await createImageBitmap(file); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 64, 64);
      const scale = Math.min(64 / bitmap.width, 64 / bitmap.height); const width = bitmap.width * scale, height = bitmap.height * scale;
      ctx.drawImage(bitmap, (64 - width) / 2, (64 - height) / 2, width, height); bitmap.close();
      data.brandOverrides[merchantKey(logoTarget)] = canvas.toDataURL('image/png'); save(); render(); toast('Logo je přidané.');
    } catch { toast('Obrázek se nepodařilo načíst. Zkus PNG, JPG nebo WebP.'); }
    event.target.value = '';
  });
  $('restoreInput').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const restored = JSON.parse(await file.text());
      if (!validState(restored) || !restored.transactions.every(row => typeof row.date === 'string' && typeof row.description === 'string' && Number.isInteger(row.cents) && row.cents < 0) || !restored.categories.every(item => typeof item.name === 'string' && iconNames.includes(item.icon))) throw new Error('invalid');
      if (confirm('Obnovit zálohu? Současná data v prohlížeči se nahradí.')) { data = migrate(restored); save(); render(); toast('Záloha je obnovená.'); }
    } catch { toast('Tenhle soubor není záloha z aplikace Výdaje.'); }
    event.target.value = '';
  });
  $('previousMonth').addEventListener('click', () => shiftMonth(-1));
  $('nextMonth').addEventListener('click', () => shiftMonth(1));
  $('rangePicker').addEventListener('click', () => {
    const form = $('periodForm');
    const [year, month] = (selectedMonth || currentMonth).split('-').map(Number);
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = new Date(year, month, 0).toLocaleDateString('sv-SE');
    form.elements.from.value = filters.from || (selectedMonth ? monthStart : data.transactions.reduce((min, row) => row.date < min ? row.date : min, currentMonth + '-01'));
    form.elements.to.value = filters.to || (selectedMonth === currentMonth ? today.toLocaleDateString('sv-SE') : selectedMonth ? monthEnd : today.toLocaleDateString('sv-SE'));
    $('periodDialog').showModal();
  });
  $('todayButton').addEventListener('click', () => { selectedMonth = currentMonth; periodBeforeRange = currentMonth; filters.from = ''; filters.to = ''; animateNext = true; render(); });
  $('clearPeriod').addEventListener('click', () => { animateNext = true; selectedMonth = null; periodBeforeRange = null; filters.from = ''; filters.to = ''; $('periodDialog').close(); render(); });
  $('quickAdd').addEventListener('click', () => { addTab = 'manual'; location.hash = '#/add'; render(); });
  window.addEventListener('hashchange', render);
  enhanceDates(document);
  if (cloud) initCloud(); else render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
