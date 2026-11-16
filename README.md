# Výdaje

Osobní přehled výdajů: měsíční limit, limity kategorií, analýza, porovnání měsíců a import výpisů.
Statická aplikace bez sestavování; účty a data běží na Firebase (Authentication + Firestore).

Zdroj `src/cloud.js` je sestavený balík Firebase SDK. Konfigurace Firebase ve stránce je veřejná záměrně, data chrání pravidla databáze: každý účet čte a zapisuje jen svoje.
