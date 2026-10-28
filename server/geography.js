// Administrative geography is distinct from landscape/search-area labels.
const provinces = {
  AQ: ['L’Aquila', 'Abruzzo'], CH: ['Chieti', 'Abruzzo'], PE: ['Pescara', 'Abruzzo'], TE: ['Teramo', 'Abruzzo'],
  AN: ['Ancona', 'Marche'], AP: ['Ascoli Piceno', 'Marche'], FM: ['Fermo', 'Marche'], MC: ['Macerata', 'Marche'], PU: ['Pesaro e Urbino', 'Marche'],
  AL: ['Alessandria', 'Piemonte'], AT: ['Asti', 'Piemonte'], BI: ['Biella', 'Piemonte'], CN: ['Cuneo', 'Piemonte'], NO: ['Novara', 'Piemonte'], TO: ['Torino', 'Piemonte'], VB: ['Verbano-Cusio-Ossola', 'Piemonte'], VC: ['Vercelli', 'Piemonte'],
  AO: ['Aosta', "Valle d'Aosta"], TN: ['Trento', 'Trentino-Alto Adige'], BZ: ['Bolzano', 'Trentino-Alto Adige'],
  BL: ['Belluno', 'Veneto'], PD: ['Padova', 'Veneto'], RO: ['Rovigo', 'Veneto'], TV: ['Treviso', 'Veneto'], VE: ['Venezia', 'Veneto'], VR: ['Verona', 'Veneto'], VI: ['Vicenza', 'Veneto'],
  PN: ['Pordenone', 'Friuli-Venezia Giulia'], UD: ['Udine', 'Friuli-Venezia Giulia'],
};
const key = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
export function normalizeGeography(property) {
  const code = Object.entries(provinces).find(([code, [name]]) => [key(code), key(name)].includes(key(property.province)))?.[0];
  const region = code ? provinces[code][1] : key(property.region) === 'piedmont' ? 'Piemonte' : property.administrativeRegion || property.region;
  return { ...property, region, administrativeRegion: region, province: code || property.province,
    ...(property.region === 'Dolomiti' ? { searchArea: property.searchArea || 'Dolomiti' } : {}) };
}
export function excludedGeography(property) {
  const p = normalizeGeography(property);
  return ['Veneto', "Valle d'Aosta"].includes(p.region);
}
