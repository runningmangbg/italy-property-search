import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import request from 'supertest';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/auth.js';
import {exercises,lessons,exerciseMap,isCorrect,vocabulary,vocabularySummary} from '../server/italian-content.js';
import {nextReview,selectPractice} from '../server/italian.js';
let pg,db,app,peter,rebecka,csrf;
before(async()=>{
 pg=new PGlite();await pg.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));
 db={query:(...a)=>pg.query(...a),transaction:fn=>pg.transaction(fn)};
 app=createApp({db,users:['peter','rebecka'].map(id=>({id,name:id,passwordHash:hashPassword('test-password')}))});
 peter=request.agent(app);rebecka=request.agent(app);
 csrf=(await peter.post('/api/login').send({username:'peter',password:'test-password'})).body.csrf;
 await rebecka.post('/api/login').send({username:'rebecka',password:'test-password'});
});
after(async()=>pg.close());
test('learning data require a session; writes require CSRF',async()=>{
 await request(app).get('/api/italian/course').expect(401);
 await request(app).get('/api/italian/practice').expect(401);
 await peter.post('/api/italian/attempt').send({}).expect(403);
 await peter.get('/italiano').expect(200).expect('Content-Type',/html/);
});
test('curriculum IDs are stable and answers preserve accents and apostrophes',()=>{
 assert.equal(new Set(exercises.map(q=>q.id)).size,exercises.length);
 assert.ok(exercises.length>600);
 assert.ok(exercises.every(q=>lessons.some(l=>l.id===q.lesson)&&q.answers.length&&q.explanation));
 assert.equal(isCorrect(exerciseMap.get('pres-essere-2'),'è'),true);
 assert.equal(isCorrect(exerciseMap.get('pres-essere-2'),'e'),false);
 assert.equal(isCorrect(exerciseMap.get('indef-amica-feminint'),' UN’ '),true);
 assert.equal(isCorrect(exerciseMap.get('pres-avere-0'),'io ho'),false);
 assert.equal(exerciseMap.get('adj-nuovo-3').answers[0],'nuove');
 assert.equal(exerciseMap.get('imp-mangiare-0').answers[0],'mangiavo');
 assert.equal(exerciseMap.get('fut-cercare-0').answers[0],'cercherò');
 assert.equal(exerciseMap.get('past-andare-3-f').answers[0],'siamo andate');
});
test('server grades answers; idempotent retries do not double-count and profiles stay separate',async()=>{
 const body={requestId:randomUUID(),exerciseId:'pres-essere-2',answer:'e'};
 const first=(await peter.post('/api/italian/attempt').set('X-CSRF-Token',csrf).send(body).expect(200)).body;
 assert.equal(first.correct,false);assert.equal(first.expected,'è');
 const repeat=(await peter.post('/api/italian/attempt').set('X-CSRF-Token',csrf).send(body).expect(200)).body;assert.equal(repeat.repeated,true);
 let data=(await peter.get('/api/italian/course')).body;
 assert.equal(data.totals.attempts,1);assert.equal(data.totals.correct,0);assert.equal(data.history[0].answer,'e');
 assert.equal(data.skills[0].needsWork,1);
 const other=(await rebecka.get('/api/italian/course')).body;assert.equal(other.totals.attempts,0);assert.equal(other.history.length,0);
 await peter.post('/api/italian/attempt').set('X-CSRF-Token',csrf).send({...body,correct:true}).expect(400);
 await peter.post('/api/italian/attempt').set('X-CSRF-Token',csrf).send({...body,requestId:randomUUID(),exerciseId:'fake'}).expect(404);
});
test('revealing a correct answer records a miss; correct repetitions schedule longer intervals and remove mastered weaknesses',async()=>{
 const base={exerciseId:'pres-essere-2',answer:'è'};
 await peter.post('/api/italian/attempt').set('X-CSRF-Token',csrf).send({...base,requestId:randomUUID(),reveal:true}).expect(200).expect(r=>assert.equal(r.body.correct,false));
 const intervals=[1,3,7];
 for(const days of intervals){const now=Date.now(),r=(await peter.post('/api/italian/attempt').set('X-CSRF-Token',csrf).send({...base,requestId:randomUUID()}).expect(200)).body;assert.ok(Math.abs(new Date(r.dueAt)-now-days*86400000)<10000);}
 const data=(await peter.get('/api/italian/course')).body;assert.equal(data.totals.attempts,5);assert.equal(data.totals.correct,3);assert.equal(data.skills[0].needsWork,0);
 const weak=(await peter.get('/api/italian/practice?level=all&mode=weak')).body;assert.equal(weak.questions.length,0);
 const r=nextReview({streak:3},false,new Date('2026-10-26T12:00:00Z'));assert.equal(r.streak,0);assert.equal(r.dueAt.toISOString(),'2026-10-26T12:10:00.000Z');
});
test('question queues prioritize due mistakes and never expose answer keys',async()=>{
 const now=Date.now();const stats=[{exercise_id:'noun-libro',attempts:2,correct:0,streak:0,due_at:new Date(now-1000)}];
 const q=selectPractice(stats,{level:'A1',mode:'smart',limit:5},now);assert.equal(q[0].id,'noun-libro');assert.equal(q[0].answers,undefined);assert.equal(q[0].explanation,undefined);
 const weak=selectPractice(stats,{level:'all',mode:'weak',limit:10},now);assert.deepEqual(weak.map(q=>q.id),['noun-libro']);
 assert.ok(selectPractice([],{level:'A2',limit:20}).every(q=>lessons.find(l=>l.id===q.lesson).level==='A2'));
 await peter.get('/api/italian/practice?lesson=not-real').expect(400);
 await peter.get('/api/italian/practice?limit=9999').expect(400);
 const data=(await peter.get('/api/italian/practice?lesson=articles&limit=5')).body;assert.equal(data.questions.length,5);assert.equal(data.questions[0].answers,undefined);
});
test('a repeated request ID cannot overwrite a different exercise',async()=>{
 const body={requestId:randomUUID(),exerciseId:'noun-casa',answer:'case'};
 await peter.post('/api/italian/attempt').set('X-CSRF-Token',csrf).send(body).expect(200);
 await peter.post('/api/italian/attempt').set('X-CSRF-Token',csrf).send({...body,exerciseId:'noun-libro',answer:'libri'}).expect(409);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM italian_progress WHERE user_id=$1 AND exercise_id=$2',['peter','noun-libro'])).rows[0].n,0);
});
test('word list requires login, supports Swedish searches, topics, word classes and bounded pages',async()=>{
 await request(app).get('/api/italian/words').expect(401);
 const all=(await peter.get('/api/italian/words').expect(200)).body;assert.equal(all.total,vocabularySummary.entries);assert.equal(all.words.length,40);
 const verbs=(await peter.get('/api/italian/words?pos=verb').expect(200)).body;assert.equal(verbs.total,200);assert.ok(verbs.words.every(w=>w.pos==='verb'));
 const next=(await peter.get('/api/italian/words?page=2').expect(200)).body;assert.notEqual(next.words[0].id,all.words[0].id);
 const search=(await peter.get('/api/italian/words?topic=health&search=h%C3%A4l').expect(200)).body;assert.ok(search.words.some(w=>w.lemma==='tallone'));assert.ok(search.words.every(w=>w.topic==='health'));
 await peter.get('/api/italian/words?page=-1').expect(400);
 const q=(await peter.get('/api/italian/practice?scope=words&direction=sv&lesson=vocab-food').expect(200)).body;assert.ok(q.questions.every(q=>q.kind==='word'&&q.direction==='sv'));
});
test('new vocabulary uses independent learner histories and production-specific mastery',async()=>{
 const csrfR=(await rebecka.post('/api/login').send({username:'rebecka',password:'test-password'})).body.csrf;
 const w=vocabulary.find(w=>w.it==='la casa');
 for(let i=0;i<3;i++)await rebecka.post('/api/italian/attempt').set('X-CSRF-Token',csrfR).send({requestId:randomUUID(),exerciseId:`vocab-${w.id}-sv`,answer:'hus'}).expect(200);
 let course=(await rebecka.get('/api/italian/course')).body;assert.equal(course.vocabulary.practiced,1);assert.equal(course.vocabulary.secure,0);
 for(let i=0;i<3;i++)await rebecka.post('/api/italian/attempt').set('X-CSRF-Token',csrfR).send({requestId:randomUUID(),exerciseId:`vocab-${w.id}-it`,answer:'casa'}).expect(200);
 course=(await rebecka.get('/api/italian/course')).body;assert.equal(course.vocabulary.secure,1);assert.equal(course.vocabulary.counts.verb,200);
 assert.equal((await peter.get('/api/italian/course')).body.vocabulary.practiced,0);
 const list=(await rebecka.get('/api/italian/words?search=casa')).body;assert.equal(list.words.find(x=>x.id===w.id).secure,true);
});
