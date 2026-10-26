import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {exercises,exerciseMap,vocabulary,vocabularySummary,verbTables,isCorrect} from '../server/italian-content.js';
import {selectPractice} from '../server/italian.js';

test('expansion preserves all original exercise IDs, answers and prompts',async()=>{
 const source=execFileSync('git',['show','4990fcbe0a76db52613012791cf75f1829c9a4c8:server/italian-content.js'],{encoding:'utf8'});
 const original=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 assert.equal(original.exercises.length,676);
 for(const q of original.exercises){const updated=exerciseMap.get(q.id);assert.ok(updated,q.id);for(const key of ['prompt','lesson','answers','explanation'])assert.deepEqual(updated[key],q[key],q.id+':'+key);}
});
test('word counts represent dictionary entries, never inflections or both training directions',()=>{
 assert.ok(vocabularySummary.entries>=1500);assert.ok(vocabularySummary.counts.verb>=200);assert.ok(vocabularySummary.phrases>=120);
 assert.equal(vocabularySummary.uniqueLemmas,new Set(vocabulary.map(w=>w.lemma)).size);
 assert.equal(exercises.filter(q=>q.kind==='word').length,2*vocabulary.length);
 assert.equal(new Set(exercises.map(q=>q.id)).size,exercises.length);
 assert.ok(exercises.every(q=>q.id.length<=100&&q.answers.length&&q.answers.every(a=>typeof a==='string'&&a.trim())));
 assert.ok(vocabulary.every(w=>w.sv.length&&w.topic&&w.id));
 // Yes and the reflexive pronoun must stay separate despite their similar spelling.
 assert.notEqual(vocabulary.find(w=>w.it==='sì').id,vocabulary.find(w=>w.it==='si').id);
});
test('representative spelling changes, irregular verbs and noun plurals are correct',()=>{
 for(const [id,answer] of Object.entries({'pres-giocare-1':'giochi','pres-studiare-1':'studi','pres-spegnere-0':'spengo','pres-dire-3':'diciamo','fut-cominciare-0':'comincerò','fut-spiegare-0':'spiegherò','fut-bere-0':'berrò','new-adj-necessario-2':'necessari','new-adj-stanco-3':'stanche','new-adj-simpatico-3':'simpatiche','new-adj-ricco-2':'ricchi'}))assert.equal(exerciseMap.get(id)?.answers[0],answer,id);
 const shirt=vocabulary.find(w=>w.it==='la camicia');assert.equal(exerciseMap.get(`new-noun-${shirt.id}`).answers[0],'camicie');
 assert.ok(verbTables.some(v=>v.infinitive==='prenotare'));
});
test('practice filters respect direction, topic and kind; mixed daily sessions include all three kinds',()=>{
 const it=selectPractice([],{scope:'words',direction:'it',lesson:'vocab-health',limit:20});
 assert.equal(it.length,20);assert.ok(it.every(q=>q.kind==='word'&&q.direction==='it'&&q.lesson==='vocab-health'));
 const sv=selectPractice([],{scope:'words',direction:'sv',limit:20});assert.ok(sv.every(q=>q.direction==='sv'));
 const phrases=selectPractice([],{scope:'phrases',lesson:'vocab-home',limit:10});assert.ok(phrases.every(q=>q.kind==='phrase'&&q.prompt.includes('___')));
 const all=selectPractice([],{scope:'all',limit:10});assert.deepEqual(new Set(all.map(q=>q.kind)),new Set(['grammar','word','phrase']));
 assert.ok(selectPractice([],{scope:'grammar',limit:20}).every(q=>q.kind==='grammar'));
 assert.ok([...it,...sv,...phrases].every(q=>!('answers' in q)&&!('explanation' in q)));
});
test('vocabulary accepts its documented synonyms and optional definite article, while preserving accents',()=>{
 const casa=vocabulary.find(w=>w.it==='la casa');
 assert.equal(isCorrect(exerciseMap.get(`vocab-${casa.id}-it`),'casa'),true);
 assert.equal(isCorrect(exerciseMap.get(`vocab-${casa.id}-it`),'LA CASA'),true);
 assert.equal(isCorrect(exerciseMap.get(`vocab-${casa.id}-sv`),'hem'),true);
 const yes=vocabulary.find(w=>w.it==='sì');assert.equal(isCorrect(exerciseMap.get(`vocab-${yes.id}-it`),'si'),false);
 const menu=exercises.find(q=>q.kind==='phrase'&&q.answers.includes('menù'));assert.equal(isCorrect(menu,'menu'),true);
});
