import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { lessons, exercises, exerciseMap, verbTables, isCorrect, vocabulary, vocabularySummary } from './italian-content.js';

export function nextReview(previous, correct, now = new Date()) {
  const streak = correct ? Math.min((previous?.streak || 0) + 1, 6) : 0;
  const minutes = correct ? [0,1440,4320,10080,20160,43200,86400][streak] : 10;
  return { streak, dueAt:new Date(now.getTime()+minutes*60000) };
}
export function selectPractice(stats, {lesson='',mode='smart',level='A1',limit=10,skill='',scope='all',direction='it'}={}, now=Date.now()) {
 const byId=new Map(stats.map(s=>[s.exercise_id,s]));
 const allowed=new Set(lessons.filter(l=>(!lesson||l.id===lesson)&&(level==='all'||l.level===level)).map(l=>l.id));
 const ranked=exercises.filter(q=>allowed.has(q.lesson)&&(!skill||q.skill===skill)&&(scope==='all'||(scope==='grammar'?q.kind==='grammar':scope==='words'?q.kind==='word':q.kind==='phrase'))&&(q.kind!=='word'||direction==='both'||q.direction===direction)).map(q=>({q,s:byId.get(q.id),tie:Math.random()}))
  .filter(({s})=>mode!=='weak'||(s&&s.attempts>s.correct&&s.streak<3))
  .sort((a,b)=>{
    const priority=({s})=>!s?2:new Date(s.due_at).getTime()<=now?(s.streak===0?0:1):3;
    if(mode==='smart'||mode==='weak') { const d=priority(a)-priority(b); if(d)return d; }
    // Randomize within a tier: new learners see a mix of persons and word groups.
    return a.tie-b.tie;
  });
 // Interleave new grammar, words and phrases, without pushing due mistakes back.
 const priority=({s})=>mode==='mixed'?0:!s?2:new Date(s.due_at).getTime()<=now?(s.streak===0?0:1):3;
 const selected=[];
 for(const tier of [0,1,2,3]) {
  const buckets=['grammar','word','phrase'].map(kind=>ranked.filter(r=>priority(r)===tier&&r.q.kind===kind));
  let changed=true;
  while(changed&&selected.length<limit){changed=false;for(const b of buckets)if(b.length&&selected.length<limit){selected.push(b.shift());changed=true;}}
 }
 return selected.map(({q})=>({id:q.id,lesson:q.lesson,kind:q.kind,direction:q.direction,label:q.label,prompt:q.prompt,hint:q.hint,translation:q.translation}));
}

export function installItalian(app,{db,session,csrf}) {
 const bodySchema=z.object({requestId:z.uuid(),exerciseId:z.string().max(100),answer:z.string().max(200),reveal:z.boolean().default(false)}).strict();
 app.get('/api/italian/course',session,async(req,res)=>{
  const stats=(await db.query('SELECT * FROM italian_progress WHERE user_id=$1',[req.user.id])).rows;
  const history=(await db.query('SELECT exercise_id,answer,correct,revealed,created_at FROM italian_attempts WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 20',[req.user.id])).rows.map(r=>{
   const q=exerciseMap.get(r.exercise_id);return {...r,prompt:q?.prompt,expected:q?.answers[0],lesson:q?.lesson};
  });
  const totals=(await db.query('SELECT count(*)::int AS attempts,count(*) FILTER(WHERE correct)::int AS correct,count(DISTINCT (created_at AT TIME ZONE \'Europe/Stockholm\')::date)::int AS days FROM italian_attempts WHERE user_id=$1',[req.user.id])).rows[0];
  const skills=new Map();
  const wordById=new Map(vocabulary.map(w=>[w.id,w]));
  const now=Date.now();
  for(const s of stats){ const q=exerciseMap.get(s.exercise_id);if(!q)continue;
   const key=q.skill;const word=wordById.get(q.wordId);const row=skills.get(key)||{id:key,lesson:q.lesson,label:word?`${word.it} · ${word.sv[0]}`:q.label,attempts:0,correct:0,items:0,due:0,needsWork:0};
   row.attempts+=s.attempts;row.correct+=s.correct;row.items++;if(s.attempts>s.correct&&s.streak<3)row.needsWork++;if(new Date(s.due_at)<=now)row.due++;skills.set(key,row);
  }
  const lessonStats=lessons.map(l=>{const rows=stats.filter(s=>exerciseMap.get(s.exercise_id)?.lesson===l.id);return {...l,total:exercises.filter(q=>q.lesson===l.id).length,practiced:rows.length,secure:rows.filter(s=>s.streak>=3).length,attempts:rows.reduce((n,s)=>n+s.attempts,0),correct:rows.reduce((n,s)=>n+s.correct,0),due:rows.filter(s=>new Date(s.due_at)<=now).length};});
  const progress=new Map(stats.map(s=>[s.exercise_id,s]));
  const wordState=w=>({practiced:!!(progress.get(`vocab-${w.id}-it`)||progress.get(`vocab-${w.id}-sv`)),secure:(progress.get(`vocab-${w.id}-it`)?.streak||0)>=3});
  const topics=lessons.filter(l=>l.kind==='vocabulary').map(l=>{const words=vocabulary.filter(w=>w.topic===l.topic);return {id:l.topic,title:l.title,description:l.description,words:words.length,phrases:exercises.filter(q=>q.lesson===l.id&&q.kind==='phrase').length,practiced:words.filter(w=>wordState(w).practiced).length,secure:words.filter(w=>wordState(w).secure).length};});
  res.json({lessons:lessonStats,verbs:verbTables,totals,skills:[...skills.values()].sort((a,b)=>a.correct/a.attempts-b.correct/b.attempts),history,due:stats.filter(s=>exerciseMap.has(s.exercise_id)&&new Date(s.due_at)<=now).length,total:exercises.length,vocabulary:{...vocabularySummary,topics,practiced:vocabulary.filter(w=>wordState(w).practiced).length,secure:vocabulary.filter(w=>wordState(w).secure).length}});
 });
 app.get('/api/italian/words',session,async(req,res)=>{
  const parsed=z.object({topic:z.string().max(50).default(''),pos:z.enum(['','noun','verb','adjective','other']).default(''),search:z.string().max(100).default(''),page:z.coerce.number().int().min(1).max(1000).default(1)}).safeParse(req.query);
  if(!parsed.success)return res.status(400).json({error:'Ogiltig ordsökning.'});
  const {topic,pos,search,page}=parsed.data;
  const norm=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  const matches=vocabulary.filter(w=>(!topic||w.topic===topic)&&(!pos||w.pos===pos)&&norm([w.it,...w.sv].join(' ')).includes(norm(search.trim())));
  const words=matches.slice((page-1)*40,page*40);
  const stats=(await db.query('SELECT exercise_id,streak,attempts FROM italian_progress WHERE user_id=$1',[req.user.id])).rows;
  const progress=new Map(stats.map(s=>[s.exercise_id,s]));
  res.json({words:words.map(w=>({...w,practiced:!!(progress.get(`vocab-${w.id}-it`)||progress.get(`vocab-${w.id}-sv`)),secure:(progress.get(`vocab-${w.id}-it`)?.streak||0)>=3})),total:matches.length,page,pages:Math.max(1,Math.ceil(matches.length/40))});
 });
 app.get('/api/italian/practice',session,async(req,res)=>{
  const parsed=z.object({lesson:z.enum(['',...lessons.map(l=>l.id)]).default(''),skill:z.string().max(100).default(''),scope:z.enum(['all','grammar','words','phrases']).default('all'),direction:z.enum(['it','sv','both']).default('it'),mode:z.enum(['smart','weak','mixed']).default('smart'),level:z.enum(['A1','A2','all']).default('A1'),limit:z.coerce.number().int().min(1).max(30).default(10)}).safeParse(req.query);
  if(!parsed.success)return res.status(400).json({error:'Välj ett giltigt övningsområde.'});
  const stats=(await db.query('SELECT * FROM italian_progress WHERE user_id=$1',[req.user.id])).rows;
  res.json({questions:selectPractice(stats,parsed.data)});
 });
 app.post('/api/italian/attempt',session,csrf,rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false}),express.json({limit:'4kb'}),async(req,res)=>{
  const parsed=bodySchema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Svaret kunde inte läsas. Försök igen.'});
  const b=parsed.data,q=exerciseMap.get(b.exerciseId);
  if(!q)return res.status(404).json({error:'Övningen finns inte längre. Starta ett nytt pass.'});
  const result=await db.transaction(async tx=>{
   // Serialize writes per learner. Retries must never count the same answer twice.
   await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`italian:${req.user.id}`]);
   const prior=(await tx.query('SELECT * FROM italian_attempts WHERE request_id=$1',[b.requestId])).rows[0];
   if(prior){if(prior.user_id!==req.user.id||prior.exercise_id!==q.id)return {status:409,error:'Det här svaret har redan använts.'};return {...prior.result,repeated:true};}
   const previous=(await tx.query('SELECT * FROM italian_progress WHERE user_id=$1 AND exercise_id=$2 FOR UPDATE',[req.user.id,q.id])).rows[0];
   const correct=!b.reveal&&isCorrect(q,b.answer);
   const review=nextReview(previous,correct);
   const result={correct,expected:q.answers[0],explanation:q.explanation,dueAt:review.dueAt.toISOString(),streak:review.streak};
   await tx.query('INSERT INTO italian_attempts(request_id,user_id,exercise_id,skill,answer,correct,revealed,result) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[b.requestId,req.user.id,q.id,q.skill,b.answer,correct,b.reveal,JSON.stringify(result)]);
   await tx.query(`INSERT INTO italian_progress(user_id,exercise_id,attempts,correct,streak,due_at,last_answer,last_correct)
    VALUES($1,$2,1,$3,$4,$5,$6,$7) ON CONFLICT(user_id,exercise_id) DO UPDATE SET
    attempts=italian_progress.attempts+1,correct=italian_progress.correct+EXCLUDED.correct,
    streak=EXCLUDED.streak,due_at=EXCLUDED.due_at,last_answer=EXCLUDED.last_answer,last_correct=EXCLUDED.last_correct,updated_at=now()`,
    [req.user.id,q.id,correct?1:0,review.streak,review.dueAt,b.answer,correct]);
   return result;
  });
  res.status(result.status||200).json(result);
 });
}
