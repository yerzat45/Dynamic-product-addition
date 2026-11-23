import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProductName,pickExactProduct,FIELDS} from '../src/matching.js';
import {planSync,syncDeal} from '../src/sync.js';
const deal = {[FIELDS.development]:'Swiss Residence',[FIELDS.building]:'Блок 11',[FIELDS.apartment]:'3'};
test('Составление имени по реальным полям БП',()=>assert.equal(buildProductName(deal),'Квартира №3 — Swiss Residence, Блок 11'));
test('Сектор учитывается в имени',()=>assert.equal(buildProductName({...deal,[FIELDS.development]:'Swiss Collection',[FIELDS.building]:'Блок 5 Сектор А'}),'Квартира №3 — Swiss Collection, Блок 5 Сектор А'));
test('Нет незаметной подмены объекта',()=>assert.throws(()=>buildProductName({...deal,[FIELDS.apartment]:''}),/не заполнены/));
test('Дубли в каталоге запрещены',()=>assert.throws(()=>pickExactProduct([{ID:1,NAME:'Квартира №3 — Swiss Residence, Блок 11'},{ID:2,NAME:'Квартира №3 — Swiss Residence, Блок 11'}],buildProductName(deal)),/Неоднозначный/));
test('Добавление не перезаписывает другие товары',()=>assert.equal(planSync([{PRODUCT_ID:'7'}],{ID:'42',PRICE:'100'},'append').action,'append'));
test('Повторный запуск не дублирует товар',()=>assert.equal(planSync([{PRODUCT_ID:'42'}],{ID:'42',PRICE:'100'},'append').action,'noop'));
test('Строгий режим исправляет неправильную позицию',()=>assert.equal(planSync([{PRODUCT_ID:'7'}],{ID:'42',PRICE:'100'},'strict').action,'replace'));
test('DRY_RUN ничего не изменяет', async()=>{
 const b={getDeal:async()=>deal,listProductsByName:async()=>[{ID:'42',NAME:buildProductName(deal),PRICE:'100'}],getRows:async()=>[],addRow:async()=>{throw Error('should not call')}};
 const r=await syncDeal(b,123,{mode:'append',dryRun:true,recheck:true});assert.equal(r.action,'append');assert.equal(r.dryRun,true);
});
