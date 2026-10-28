import test from 'node:test';
import assert from 'node:assert/strict';
import { budget, rank } from '../server/domain.js';

test('an unreachable advert is unranked without falsely marking the home sold or changing its score', () => {
  const p={id:'AB001',region:'Abruzzo',province:'CH',price:180000,score:95,availability:'advertised',advertReachability:'unverified'};
  const [result]=rank([{id:p.id,data:p}]);
  assert.equal(result.pool,'unverified'); assert.equal(result.rank,null);
  assert.equal(result.score,95); assert.equal(result.availability,'advertised');
  assert.equal(budget({...p,price:280000}).pool,'unverified');
  assert.equal(budget({...p,advertReachability:'reachable'}).pool,'ranked');
});

test('advert checks cannot reopen personal exclusions, list removals or confirmed unavailability', () => {
  const p={region:'Marche',province:'MC',price:180000,score:80,advertReachability:'unverified'};
  assert.equal(budget(p,{status:'Closed'}).pool,'closed');
  assert.equal(budget(p,{status:'On hold'}).pool,'hold');
  assert.equal(budget(p,{removed_reference_ids:['12345678']}).pool,'excluded');
  assert.equal(budget(p,{rejection_reference_ids:['12345678']}).pool,'excluded');
  assert.equal(budget({...p,availability:'sold'}).pool,'inactive');
});
