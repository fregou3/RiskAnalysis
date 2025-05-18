/**
 * Service de mise en cache pour les données Pappers
 * Permet de réduire le nombre d'appels à l'API et d'améliorer les performances
 */

// Durée de validité du cache en millisecondes (24 heures)
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Structure du cache
const cache = {
  companies: {}, // Recherche d'entreprises par nom
  details: {},   // Détails d'entreprise par SIREN
  finances: {},  // Données financières par SIREN
  management: {}, // Dirigeants par SIREN
  beneficiaries: {} // Bénéficiaires effectifs par SIREN
};

/**
 * Vérifie si une entrée de cache est valide
 * @param {Object} cacheEntry - L'entrée de cache à vérifier
 * @returns {boolean} - true si l'entrée est valide, false sinon
 */
function isValidCacheEntry(cacheEntry) {
  if (!cacheEntry || !cacheEntry.timestamp) {
    return false;
  }
  
  const now = Date.now();
  return (now - cacheEntry.timestamp) < CACHE_TTL;
}

/**
 * Récupère une donnée du cache
 * @param {string} cacheType - Le type de cache (companies, details, finances, etc.)
 * @param {string} key - La clé de l'entrée dans le cache
 * @returns {Object|null} - La donnée mise en cache ou null si non trouvée ou expirée
 */
function get(cacheType, key) {
  if (!cache[cacheType] || !cache[cacheType][key]) {
    return null;
  }
  
  const cacheEntry = cache[cacheType][key];
  
  if (!isValidCacheEntry(cacheEntry)) {
    // Supprimer l'entrée expirée
    delete cache[cacheType][key];
    return null;
  }
  
  console.log(`Cache hit for ${cacheType}:${key}`);
  return cacheEntry.data;
}

/**
 * Met une donnée en cache
 * @param {string} cacheType - Le type de cache (companies, details, finances, etc.)
 * @param {string} key - La clé de l'entrée dans le cache
 * @param {Object} data - La donnée à mettre en cache
 */
function set(cacheType, key, data) {
  if (!cache[cacheType]) {
    cache[cacheType] = {};
  }
  
  cache[cacheType][key] = {
    timestamp: Date.now(),
    data
  };
  
  console.log(`Cache set for ${cacheType}:${key}`);
}

/**
 * Vide le cache ou une partie spécifique du cache
 * @param {string} [cacheType] - Le type de cache à vider (optionnel)
 */
function clear(cacheType) {
  if (cacheType) {
    if (cache[cacheType]) {
      cache[cacheType] = {};
      console.log(`Cache cleared for ${cacheType}`);
    }
  } else {
    // Vider tout le cache
    Object.keys(cache).forEach(type => {
      cache[type] = {};
    });
    console.log('All cache cleared');
  }
}

/**
 * Obtient des statistiques sur l'utilisation du cache
 * @returns {Object} - Statistiques du cache
 */
function getStats() {
  const stats = {};
  
  Object.keys(cache).forEach(type => {
    const entries = Object.keys(cache[type]).length;
    const validEntries = Object.values(cache[type]).filter(entry => isValidCacheEntry(entry)).length;
    
    stats[type] = {
      total: entries,
      valid: validEntries,
      expired: entries - validEntries
    };
  });
  
  return stats;
}

module.exports = {
  get,
  set,
  clear,
  getStats
};
