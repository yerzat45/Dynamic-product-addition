import {FIELDS, buildProductName, canonical, pickExactProduct} from './matching.js';

export function snapshot(deal) { return [FIELDS.development,FIELDS.building,FIELDS.apartment].map(f => canonical(deal[f])).join('|'); }
export function planSync(rows, product, mode) {
  const productId = Number(product.ID);
  if (!Number.isSafeInteger(productId) || productId <= 0) throw new Error('Некорректный ID товара');
  const price = Number(product.PRICE);
  if (!Number.isFinite(price) || price < 0) throw new Error('Некорректная цена товара в каталоге');
  const target = {PRODUCT_ID: productId, PRICE: price, QUANTITY: 1};
  const matching = rows.filter(r => Number(r.PRODUCT_ID) === productId);
  if (mode === 'append') {
    if (matching.length) return {action:'noop', reason:'Товар уже есть в сделке', target};
    return {action:'append', target};
  }
  if (rows.length === 1 && matching.length === 1 && Number(rows[0].QUANTITY) === 1 && Number(rows[0].PRICE) === price) return {action:'noop',reason:'Товарная позиция уже корректна',target};
  return {action:'replace',target};
}
export async function syncDeal(bitrix, id, {mode, dryRun, recheck}) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Некорректный ID сделки');
  const deal = await bitrix.getDeal(id);
  if (!deal) throw new Error('Сделка не найдена');
  const wantedName = buildProductName(deal);
  const products = await bitrix.listProductsByName(wantedName);
  const product = pickExactProduct(products, wantedName);
  const rows = await bitrix.getRows(id);
  const plan = planSync(rows, product, mode);
  const summary = {dealId:id, name:wantedName, productId:Number(product.ID), existingProductIds:rows.map(r=>Number(r.PRODUCT_ID)), action:plan.action, mode, dryRun};
  if (plan.action === 'noop' || dryRun) return summary;
  if (recheck) {
    const current = await bitrix.getDeal(id);
    if (!current || snapshot(current) !== snapshot(deal)) throw new Error('Поля объекта изменились во время обработки, операция отменена');
    const latestRows = await bitrix.getRows(id);
    // optimistic guard — avoid replacing concurrently changed rows
    if (JSON.stringify(latestRows) !== JSON.stringify(rows)) throw new Error('Товары сделки изменились во время обработки, повторите запрос');
  }
  if (plan.action === 'append') await bitrix.addRow(id, plan.target);
  else await bitrix.setRows(id, [plan.target]);
  return {...summary, changed:true};
}
