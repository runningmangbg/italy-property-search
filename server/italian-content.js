// Stable exercise IDs keep individual learning histories intact as the course grows.
export const lessons = [
  { id:'nouns', title:'Substantiv: en eller flera', category:'Substantiv', level:'A1', description:'Genus och plural, från casa till case.', rule:'Substantiv har maskulint eller feminint genus. Oftast blir -o → -i, -a → -e och -e → -i i plural. Genus behöver läras tillsammans med ordet: il libro, la casa. Slutbokstaven är en ledtråd, ingen garanti.', examples:[['il libro → i libri','boken → böckerna'],['la casa → le case','huset → husen'],['il ristorante → i ristoranti','restaurangen → restaurangerna'],['la notte → le notti','natten → nätterna'],['il problema → i problemi','problema är maskulint trots -a'],['il caffè → i caffè','ord med betonad slutvokal ändras inte']], note:'Många ord på -ca/-ga får -che/-ghe för att behålla det hårda ljudet: amica → amiche. Vanliga undantag: uomo → uomini, uovo → uova. Pluralformen uova är feminin.' },
  { id:'articles', title:'Artiklar: il, lo, la …', category:'Substantiv', level:'A1', description:'Välj artikel efter genus, antal och första ljud.', rule:'Maskulin singular: il framför de flesta konsonanter, lo framför bland annat s + konsonant, z, gn och ps, l’ framför vokal. Plural: i efter il, gli efter lo och l’. Feminin: la framför konsonant och l’ framför vokal; plural är alltid le.', examples:[['il libro → i libri','vanlig konsonant, maskulint'],['lo studente → gli studenti','s + konsonant'],['lo zaino → gli zaini','z'],['l’amico → gli amici','vokal, maskulint'],['la casa → le case','konsonant, feminint'],['l’amica → le amiche','vokal, feminint']], note:'Obestämd artikel: un libro, uno studente, una casa, un’amica. Un framför maskulint ord har ingen apostrof: un amico. Un’ är femininformen framför vokal.' },
  { id:'adjectives', title:'Adjektiv som följer substantivet', category:'Adjektiv', level:'A1', description:'Böj efter både genus och antal.', rule:'Ett adjektiv på -o har oftast fyra former: -o (maskulin singular), -a (feminin singular), -i (maskulin plural), -e (feminin plural). Ett adjektiv på -e har två: -e i singular och -i i plural, oavsett genus.', examples:[['un libro nuovo / libri nuovi','en ny bok / nya böcker'],['una casa nuova / case nuove','ett nytt hus / nya hus'],['un libro interessante / libri interessanti','-e → -i'],['una casa interessante / case interessanti','samma böjning för feminint'],['una casa bianca / case bianche','-ca → -che behåller k-ljudet']], note:'Det italienska substantivets genus styr, inte svenskans en/ett. Casa är feminint trots att vi säger ett hus. Vissa adjektiv ändras inte: rosa och blu. Här tränar vi vanliga efterställda adjektiv; bello och buono har också särskilda former före substantiv.' },
  { id:'present-regular', title:'Presens: regelbundna verb', category:'Verb', level:'A1', description:'Jag pratar, du ser, vi öppnar.', rule:'Ta bort infinitivens -are, -ere eller -ire och lägg till personändelsen. Parlare: parlo, parli, parla, parliamo, parlate, parlano. Vedere: vedo, vedi, vede, vediamo, vedete, vedono. Dormire: dormo, dormi, dorme, dormiamo, dormite, dormono.', examples:[['io parlo · noi parliamo','jag pratar · vi pratar'],['tu vedi · voi vedete','du ser · ni ser'],['lui dorme · loro dormono','han sover · de sover'],['io capisco · noi capiamo','-isc i vissa -ire-verb']], note:'Capire och finire får -isc- i io, tu, lui/lei och loro: capisco, capisci, capisce, capiamo, capite, capiscono. Subjektet utelämnas ofta eftersom verbformen visar vem det gäller.' },
  { id:'present-irregular', title:'Presens: de viktigaste undantagen', category:'Verb', level:'A1', description:'Essere, avere, andare och andra vardagsverb.', rule:'De vanligaste verben är ofta oregelbundna. Lär in hela raden och använd formerna i små meningar. Essere: sono, sei, è, siamo, siete, sono. Avere: ho, hai, ha, abbiamo, avete, hanno.', examples:[['io sono · tu sei · lei è','jag är · du är · hon är'],['io ho · noi abbiamo','jag har · vi har'],['io vado · noi andiamo','jag går/åker · vi går/åker'],['io faccio · voi fate','jag gör · ni gör'],['io posso · loro possono','jag kan · de kan']], note:'È (är) och e (och) är olika ord. Accenten räknas i rättningen. Ho, hai, ha och hanno skrivs med stumt h. Lei som artigt tilltal använder tredje person singular: Lei è.' },
  { id:'past', title:'Passato prossimo: det som har hänt', category:'Verb', level:'A2', description:'Hjälpverb + perfekt particip.', rule:'Passato prossimo bildas med presens av avere eller essere plus particip: ho parlato, sono arrivato. Regelbundna particip slutar på -ato, -uto eller -ito. Hjälpverbet måste läras med verbet; alla rörelseverb använder inte essere.', examples:[['ho parlato · abbiamo mangiato','jag har pratat · vi har ätit'],['ho visto · hanno fatto','oregelbundna particip'],['lei è arrivata · loro sono arrivati','med essere följer participet genus och antal'],['noi abbiamo dormito','dormire använder avere']], note:'Med essere tränar frågorna ett uttryckligt genus: arrivato/arrivata/arrivati/arrivate. Med avere ändras participet normalt inte efter subjektet. Överensstämmelse med föregående objektspronomen ingår inte här.' },
  { id:'imperfect', title:'Imperfetto: brukade och höll på', category:'Verb', level:'A2', description:'Bakgrund, vanor och pågående förlopp förr.', rule:'Imperfetto används ofta för tidigare vanor, beskrivningar och pågående förlopp. Ta bort -re och lägg till -vo, -vi, -va, -vamo, -vate, -vano: parlare → parlavo. Essere är oregelbundet: ero, eri, era, eravamo, eravate, erano.', examples:[['Da bambino parlavo italiano.','Som barn pratade jag italienska.'],['Mentre mangiavamo, è arrivata.','Medan vi åt kom hon.'],['Prima abitavamo in Svezia.','Tidigare bodde vi i Sverige.']], note:'Passato prossimo beskriver ofta en avgränsad händelse, imperfetto dess bakgrund. Valet beror på sammanhanget. Här anges tempus i frågan så att ni kan nöta själva böjningen.' },
  { id:'future', title:'Futuro semplice: det som kommer', category:'Verb', level:'A2', description:'Jag ska prata, vi kommer att vara.', rule:'Regelbundet futurum: -are blir -er-; -ere och -ire tappar sista e. Lägg till -ò, -ai, -à, -emo, -ete, -anno: parlerò, parlerai, parlerà, parleremo, parlerete, parleranno.', examples:[['domani parlerò','i morgon ska jag prata'],['noi partiremo','vi ska resa iväg'],['sarò · avrò · andrò','oregelbundna stammar: sar-, avr-, and-']], note:'Accenterna i första och tredje person singular är viktiga: parlerò, parlerà. Italienska använder också presens för framtid när tiden är tydlig: domani parto.' }
];

export const exercises = [];
function add(id, lesson, skill, label, prompt, answers, explanation, hint, translation='') {
  exercises.push({id, lesson, skill, label, prompt, answers:Array.isArray(answers)?answers:[answers], explanation, hint, translation});
}
const nouns = [
 ['libro','libri','il','i','bok','o-i'],['tavolo','tavoli','il','i','bord','o-i'],['giardino','giardini','il','i','trädgård','o-i'],['bagno','bagni','il','i','badrum','o-i'],['ragazzo','ragazzi','il','i','pojke','o-i'],['casa','case','la','le','hus','a-e'],['camera','camere','la','le','rum','a-e'],['finestra','finestre','la','le','fönster','a-e'],['porta','porte','la','le','dörr','a-e'],['ragazza','ragazze','la','le','flicka','a-e'],['ristorante','ristoranti','il','i','restaurang','e-i'],['fiore','fiori','il','i','blomma','e-i'],['notte','notti','la','le','natt','e-i'],['chiave','chiavi','la','le','nyckel','e-i'],['stazione','stazioni','la','le','station','e-i'],['mare','mari','il','i','hav','e-i'],['studente','studenti','lo','gli','student (man)','article-lo'],['zaino','zaini','lo','gli','ryggsäck','article-lo'],['specchio','specchi','lo','gli','spegel','article-lo'],['amico','amici',"l'",'gli','vän (man)','exception'],['amica','amiche',"l'",'le','vän (kvinna)','ca-che'],['albergo','alberghi',"l'",'gli','hotell','go-ghi'],['città','città','la','le','stad','invariant'],['caffè','caffè','il','i','kaffe','invariant'],['problema','problemi','il','i','problem','exception'],['mano','mani','la','le','hand','exception'],['uomo','uomini',"l'",'gli','man','exception'],['uovo','uova',"l'",'le','ägg','exception'],['banca','banche','la','le','bank','ca-che'],['spiaggia','spiagge','la','le','strand','exception'],['acqua','acque',"l'",'le','vatten','a-e'],['ospite','ospiti',"l'",'gli','gäst (man)','e-i']
];
const join=(a,w)=>a.endsWith("'")?a+w:a+' '+w;
for(const [singular,plural,article,pluralArticle,swedish,pattern] of nouns) {
 const exp=`${join(article,singular)} → ${join(pluralArticle,plural)}. ${pattern==='invariant'?'Ord med betonad slutvokal ändras inte.':pattern==='exception'?'Lär in detta undantag tillsammans med artikeln.':`I det här ordet böjs ${singular} till ${plural}.`}`;
 add(`noun-${singular}`,'nouns',`noun-${pattern}`,`Plural · ${pattern}`,`Skriv plural av ${singular}.`,plural,exp,'Tänk på ordets ändelse och eventuella undantag.',swedish);
 add(`article-s-${singular}`,'articles',`article-${article}`,`Bestämd artikel · singular`,`___ ${singular} (${swedish})`,article,`${join(article,singular)}. ${article==='lo'?'Maskulint: lo före s + konsonant eller z.':article==="l'"?'Framför vokal blir il/la l’.':article==='la'?'Feminint singular: la framför konsonant.':'Maskulint singular: il framför vanlig konsonant.'}`,'Svara bara med den bestämda artikeln.');
 add(`article-p-${singular}`,'articles',`article-${pluralArticle}`,`Bestämd artikel · plural`,`___ ${plural} (${swedish}, plural)`,pluralArticle,`${join(pluralArticle,plural)}. ${pluralArticle==='gli'?'Maskulin plural efter lo/l’: gli.':pluralArticle==='le'?'Feminin plural: le.':'Maskulin plural efter il: i.'}`,'Tänk på både genus och ordets första ljud.');
}
for(const [word,answer,label] of [['libro','un','maskulint'],['studente','uno','maskulint'],['zaino','uno','maskulint'],['amico','un','maskulint'],['casa','una','feminint'],['amica',"un'",'feminint'],['albergo','un','maskulint'],['camera','una','feminint'],['specchio','uno','maskulint'],['ospite',"un'",'feminint']]) add(`indef-${word}-${label}`,'articles','article-indef','Obestämd artikel',`___ ${word} (${label})`,answer,`${join(answer,word)}. ${answer==="un'"?'Feminin un’ framför vokal.':answer==='un'?'Maskulint un, utan apostrof även framför vokal.':answer==='uno'?'Uno framför bland annat s + konsonant och z.':'Una framför feminin konsonant.'}`,'Un, uno, una eller un’?');

const adjectives=[['nuovo','nuova','nuovi','nuove','ny'],['bello','bella','belli','belle','vacker'],['piccolo','piccola','piccoli','piccole','liten'],['grande','grande','grandi','grandi','stor'],['interessante','interessante','interessanti','interessanti','intressant'],['verde','verde','verdi','verdi','grön'],['rosso','rossa','rossi','rosse','röd'],['italiano','italiana','italiani','italiane','italiensk'],['buono','buona','buoni','buone','god'],['vecchio','vecchia','vecchi','vecchie','gammal'],['bianco','bianca','bianchi','bianche','vit'],['lungo','lunga','lunghi','lunghe','lång'],['aperto','aperta','aperti','aperte','öppen'],['chiuso','chiusa','chiusi','chiuse','stängd'],['comodo','comoda','comodi','comode','bekväm'],['gentile','gentile','gentili','gentili','vänlig'],['blu','blu','blu','blu','blå'],['rosa','rosa','rosa','rosa','rosa']];
const contexts=[['Il libro è','maskulin singular'],['La casa è','feminin singular'],['I libri sono','maskulin plural'],['Le case sono','feminin plural']];
for(const a of adjectives) for(let i=0;i<4;i++) add(`adj-${a[0]}-${i}`,'adjectives',`adj-${['blu','rosa'].includes(a[0])?'invariant':a[0].endsWith('e')?'e':a[0].endsWith('co')||a[0].endsWith('go')?'spelling':'o'}`,`Adjektiv · ${contexts[i][1]}`,`${contexts[i][0]} ___ (${a[0]}).`,a[i],`${contexts[i][0]} ${a[i]}. Adjektivet följer substantivets genus och antal: ${contexts[i][1]}.`,'Utgå från italienskans libro/casa, inte svenskans en/ett.',a[4]);

export const persons=['io','tu','lui/lei','noi','voi','loro'];
const verbs=[
 ['parlare','prata','are',['parlo','parli','parla','parliamo','parlate','parlano'],'parlato','avere','parler'],
 ['abitare','bo','are',['abito','abiti','abita','abitiamo','abitate','abitano'],'abitato','avere','abiter'],
 ['lavorare','arbeta','are',['lavoro','lavori','lavora','lavoriamo','lavorate','lavorano'],'lavorato','avere','lavorer'],
 ['mangiare','äta','are',['mangio','mangi','mangia','mangiamo','mangiate','mangiano'],'mangiato','avere','manger'],
 ['cercare','leta','are',['cerco','cerchi','cerca','cerchiamo','cercate','cercano'],'cercato','avere','cercher'],
 ['pagare','betala','are',['pago','paghi','paga','paghiamo','pagate','pagano'],'pagato','avere','pagher'],
 ['vedere','se','ere',['vedo','vedi','vede','vediamo','vedete','vedono'],'visto','avere','vedr'],
 ['prendere','ta','ere',['prendo','prendi','prende','prendiamo','prendete','prendono'],'preso','avere','prender'],
 ['dormire','sova','ire',['dormo','dormi','dorme','dormiamo','dormite','dormono'],'dormito','avere','dormir'],
 ['partire','resa iväg','ire',['parto','parti','parte','partiamo','partite','partono'],'partito','essere','partir'],
 ['capire','förstå','isc',['capisco','capisci','capisce','capiamo','capite','capiscono'],'capito','avere','capir'],
 ['finire','avsluta något','isc',['finisco','finisci','finisce','finiamo','finite','finiscono'],'finito','avere','finir'],
 ['essere','vara','irregular',['sono','sei','è','siamo','siete','sono'],'stato','essere','sar'],
 ['avere','ha','irregular',['ho','hai','ha','abbiamo','avete','hanno'],'avuto','avere','avr'],
 ['andare','gå/åka','irregular',['vado','vai','va','andiamo','andate','vanno'],'andato','essere','andr'],
 ['fare','göra','irregular',['faccio','fai','fa','facciamo','fate','fanno'],'fatto','avere','far'],
 ['venire','komma','irregular',['vengo','vieni','viene','veniamo','venite','vengono'],'venuto','essere','verr'],
 ['potere','kunna','irregular',['posso','puoi','può','possiamo','potete','possono'],null,'avere','potr'],
 ['volere','vilja','irregular',['voglio','vuoi','vuole','vogliamo','volete','vogliono'],null,'avere','vorr'],
 ['dovere','måste','irregular',['devo','devi','deve','dobbiamo','dovete','devono'],null,'avere','dovr'],
 ['sapere','veta/kunna','irregular',['so','sai','sa','sappiamo','sapete','sanno'],null,'avere','sapr'],
 ['stare','må/stanna','irregular',['sto','stai','sta','stiamo','state','stanno'],null,'essere','star'],
 ['arrivare','anlända','are',['arrivo','arrivi','arriva','arriviamo','arrivate','arrivano'],'arrivato','essere','arriver']
];
export const verbTables=verbs.map(([infinitive,swedish,group,present])=>({infinitive,swedish,group,present}));
for(const [inf,sw,group,forms,participle,aux,futureStem] of verbs) {
 for(let i=0;i<6;i++) {
  const irregular=group==='irregular', lesson=irregular?'present-irregular':'present-regular';
  add(`pres-${inf}-${i}`,lesson,irregular?`verb-${inf}`:`present-${group}`,`Presens · ${persons[i]}`,`${persons[i]} ___ (${inf})`,forms[i],`${persons[i]} ${forms[i]}. ${irregular?'Oregelbundet verb':group==='isc'?'Ett -isc-verb':`Verb på -${group}`}: ${forms.join(', ')}.`,`Sök formen för ${persons[i]}.`,sw);
  // Mangiare/cercare/pagare have spelling changes already reflected in the stem.
  if(!irregular) {
   const imperfect=inf.slice(0,-2)+['vo','vi','va','vamo','vate','vano'][i];
   add(`imp-${inf}-${i}`,'imperfect',`imperfect-${group}`,`Imperfetto · ${persons[i]}`,`${persons[i]} ___ (${inf}, imperfetto)`,imperfect,`${persons[i]} ${imperfect}. Ta bort -re från ${inf} och lägg till ${['-vo','-vi','-va','-vamo','-vate','-vano'][i]}.`,'Behåll vokalen före -re.',sw);
  } else if(inf==='essere') {
   const form=['ero','eri','era','eravamo','eravate','erano'][i];
   add(`imp-${inf}-${i}`,'imperfect','imperfect-essere',`Imperfetto · ${persons[i]}`,`${persons[i]} ___ (essere, imperfetto)`,form,`Essere: ero, eri, era, eravamo, eravate, erano.`,'Essere har stammen er- i imperfetto.',sw);
  }
  const fut=futureStem+['ò','ai','à','emo','ete','anno'][i];
  add(`fut-${inf}-${i}`,'future',irregular||inf==='vedere'?`future-irregular`:`future-regular`,`Futurum · ${persons[i]}`,`${persons[i]} ___ (${inf}, futuro semplice)`,fut,`${persons[i]} ${fut}. Stammen är ${futureStem}- och ändelsen ${['-ò','-ai','-à','-emo','-ete','-anno'][i]}.`,'Första och tredje person singular har accent.',sw);
  if(participle && aux==='avere') {
   const answer=['ho','hai','ha','abbiamo','avete','hanno'][i]+' '+participle;
   add(`past-${inf}-${i}`,'past','past-avere',`Passato prossimo · ${persons[i]}`,`${persons[i]} ___ (${inf}, passato prossimo)`,answer,`${persons[i]} ${answer}. Avere i presens + participet ${participle}.`,'Skriv både hjälpverb och particip.',sw);
  }
  if(participle && aux==='essere') for(const gender of ['m','f']) {
   const ending=i<3?(gender==='m'?'o':'a'):(gender==='m'?'i':'e');
   const part=participle.slice(0,-1)+ending, answer=['sono','sei','è','siamo','siete','sono'][i]+' '+part;
   const label=i<3?(gender==='m'?'man':'kvinna'):(gender==='m'?'män eller blandad grupp':'enbart kvinnor');
   const subject=i===2?(gender==='m'?'lui':'lei'):persons[i];
   add(`past-${inf}-${i}-${gender}`,'past','past-essere',`Passato prossimo · ${label}`,`${subject} ___ (${inf}, ${label})`,answer,`${subject} ${answer}. Essere + particip, med ${ending} för ${label}.`,'Skriv hjälpverbet och böj participet efter subjektet.',sw);
  }
 }
}
export const exerciseMap = new Map(exercises.map(q=>[q.id,q]));
export const normalizeAnswer = value => String(value).normalize('NFC').toLocaleLowerCase('it').replace(/[’‘`]/g,"'").replace(/\s+/g,' ').replace(/\s*'\s*/g,"'").trim();
export const isCorrect = (exercise,answer) => exercise.answers.some(a=>normalizeAnswer(a)===normalizeAnswer(answer));
