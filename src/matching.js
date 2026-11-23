export const FIELDS = Object.freeze({
  development: 'UF_CRM_1789104591',
  building: 'UF_CRM_1789104577',
  apartment: 'UF_CRM_1789104515',
});

export function clean(value) {
  return String(value ?? '').normalize('NFC').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
export function canonical(value) {
  return clean(value).toLocaleLowerCase('ru-RU').replace(/\s*([,—№])\s*/g, '$1');
}
export function buildProductName(deal) {
  const development = clean(deal[FIELDS.development]);
  const building = clean(deal[FIELDS.building]);
  const rawNumber = clean(deal[FIELDS.apartment]);
  if (!development || !building || !rawNumber) throw new Error('В сделке не заполнены название ЖК, название дома или номер помещения');
  if (!['Swiss Residence', 'Swiss Collection'].some(x => canonical(x) === canonical(development))) throw new Error('ЖК не входит в разрешённый список');
  if (!/^Блок\s+\d+(?:\s+Сектор\s+[А-ЯA-Z])?$/iu.test(building)) throw new Error('Неожиданный формат названия дома');
  if (!/^\d+[а-яa-z]?(?:[/-]\d+[а-яa-z]?)?$/iu.test(rawNumber)) throw new Error('Неожиданный формат номера помещения');
  return `Квартира №${rawNumber} — ${development}, ${building}`;
}
export function pickExactProduct(products, wantedName) {
  const matches = products.filter(p => canonical(p.NAME) === canonical(wantedName) && p.ACTIVE !== 'N');
  if (!matches.length) throw new Error(`Товар не найден: ${wantedName}`);
  if (matches.length > 1) throw new Error(`Неоднозначный товар: ${wantedName}; найдено ${matches.length} совпадений`);
  return matches[0];
}
