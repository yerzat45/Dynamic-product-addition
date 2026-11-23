export class Bitrix {
  constructor(url, fetchImpl = fetch) { this.url = url; this.fetch = fetchImpl; }
  async call(method, args = {}) {
    const endpoint = new URL(`${method}.json`, this.url);
    for (let attempt = 0; attempt < 4; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      let r, data;
      try {
        r = await this.fetch(endpoint, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(args), signal:controller.signal});
        data = await r.json();
      } catch (e) { throw new Error(`Ошибка соединения с Битрикс24 (${method}): ${e.message}`); }
      finally { clearTimeout(timer); }
      if ((r.status === 429 || data.error === 'QUERY_LIMIT_EXCEEDED') && attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 500 * (2 ** attempt))); continue;
      }
      if (!r.ok || data.error) throw new Error(`REST ${method}: ${data.error_description || data.error || 'HTTP '+r.status}`);
      return data;
    }
  }
  async listProductsByName(name) {
    const out = [];
    let start = 0;
    while (true) {
      const data = await this.call('crm.product.list', {filter: {'=NAME': name}, select: ['ID','NAME','PRICE','CURRENCY_ID','ACTIVE'], start});
      if (!Array.isArray(data.result)) throw new Error('crm.product.list вернул неожиданный формат');
      out.push(...data.result);
      if (data.next === undefined || data.next === null) return out;
      if (data.next <= start) throw new Error('crm.product.list: некорректная пагинация');
      start = data.next;
      if (out.length > 5000) throw new Error('Слишком много найденных товаров');
    }
  }
  async getDeal(id) { const d = await this.call('crm.deal.get', {id}); return d.result; }
  async getRows(id) { const d = await this.call('crm.deal.productrows.get', {id}); return d.result || []; }
  async addRow(id, row) { return this.call('crm.item.productrow.add', {fields:{ownerType:'D', ownerId:id, productId: Number(row.PRODUCT_ID), price: Number(row.PRICE), quantity:1}}); }
  async setRows(id, rows) { return this.call('crm.deal.productrows.set', {id, rows}); }
}
