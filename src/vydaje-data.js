// Výchozí nastavení aplikace. Ve veřejné verzi nejsou žádné předvyplněné platby.
window.VydajeData = (() => {
  const baseCategories = ['Jídlo', 'Benzín', 'Parkování', 'Předplatné', 'Zábava', 'Rozmar', 'Nepočítá se', 'Elektronika', 'Auto', 'Drogerie', 'Nezařazeno'];
  return { transactions: [], baseCategories, storageKey: 'vydaje-kategorie-v1' };
})();
