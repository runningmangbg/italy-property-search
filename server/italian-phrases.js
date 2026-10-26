// One constrained gap, with a complete Swedish context, avoids marking natural
// alternative translations of whole sentences as wrong.
const rows=`
people|Mi ___ Peter.|chiamo|Jag heter Peter.|Chiamarsi: mi chiamo = jag heter.
people|___ di conoscerla.|Piacere|Trevligt att träffa er (artigt).|Piacere di conoscerla är ett artigt sätt att hälsa.
people|Veniamo ___ Svezia.|dalla|Vi kommer från Sverige.|Venire da: da + la = dalla.
people|___ in questo paese.|Abitiamo|Vi bor i den här byn.|Abitare: noi abitiamo.
people|Come ___ chiama?|si|Vad heter ni? (artigt)|Lei använder si chiama.
people|Parlo solo un ___ di italiano.|po'|Jag pratar bara lite italienska.|Un po’ skrivs med apostrof, inte accent.
people|Può parlare più ___?|lentamente;piano|Kan ni prata långsammare?|Più lentamente eller più piano = långsammare.
people|Può ___, per favore?|ripetere|Kan ni upprepa, tack?|Può + infinitiv.
people|Non ho ___.|capito|Jag förstod inte.|Capire: ho capito, med non framför hjälpverbet.
people|Che cosa ___ questa parola?|significa|Vad betyder det här ordet?|Significare = betyda.
people|Come si ___ in italiano?|dice|Hur säger man det på italienska?|Si dice = man säger.
people|È un ___ conoscerla.|piacere|Det är ett nöje att träffa er.|Un piacere = ett nöje.
home|Non c'è acqua ___.|calda|Det finns inget varmvatten.|Acqua är feminint: calda.
home|Il riscaldamento non ___.|funziona|Uppvärmningen fungerar inte.|Funzionare: funziona i tredje person singular.
home|C'è una ___ d'acqua.|perdita|Det finns en vattenläcka.|Una perdita d’acqua = en vattenläcka.
home|Può mandare un ___?|idraulico|Kan ni skicka en rörmokare?|Un idraulico: maskulint un har ingen apostrof.
home|Vorrei un ___ per i lavori.|preventivo|Jag skulle vilja ha en offert för arbetena.|Un preventivo = ett kostnadsförslag.
home|Quanto ___ la riparazione?|costa|Hur mycket kostar reparationen?|Costare: costa med singular.
home|Quando può ___?|venire|När kan ni komma?|Può + infinitiven venire.
home|La porta è ___.|chiusa|Dörren är stängd.|Porta är feminint singular: chiusa.
home|Dove sono le ___?|chiavi|Var är nycklarna?|Chiave → chiavi, feminint plural.
home|Devo ___ la bolletta.|pagare|Jag måste betala räkningen.|Devo + infinitiv.
home|Vorremmo ___ una casa.|comprare|Vi skulle vilja köpa ett hus.|Vorremmo är artigt: vi skulle vilja.
home|C'è ___ sul muro.|muffa|Det finns mögel på väggen.|La muffa = mögel.
food|Vorrei ___ un tavolo per due.|prenotare|Jag skulle vilja boka ett bord för två.|Prenotare un tavolo = boka ett bord.
food|Il ___, per favore.|menù;menu|Menyn, tack.|Menù kan också skrivas menu.
food|Sono ___ per ordinare.|pronto|Jag är redo att beställa (en man talar).|Pronto för man; en kvinna säger pronta.
food|Che cosa ci ___?|consiglia|Vad rekommenderar ni oss? (artigt)|Consigliare: Lei consiglia.
food|Per me una birra alla ___.|spina|En fatöl till mig.|Alla spina = på fat.
food|Acqua naturale o ___?|frizzante;gassata|Stilla eller kolsyrat vatten?|Frizzante och gassata används om kolsyrat vatten.
food|Sono ___ alle noci.|allergico|Jag är allergisk mot nötter (en man talar).|Allergico a: a + le = alle.
food|Senza ___, per favore.|glutine|Utan gluten, tack.|Senza = utan.
food|Il ___, per favore.|conto|Notan, tack.|Il conto = restaurangnotan.
food|Possiamo pagare ___?|separatamente|Kan vi betala var för sig?|Separatamente = separat.
food|Era tutto ___.|buonissimo|Allt var jättegott.|Buonissimo förstärker buono.
food|Possiamo ___ fuori?|mangiare|Kan vi äta utomhus?|Fuori = ute eller utomhus.
shopping|Quanto ___ queste mele?|costano|Hur mycket kostar de här äpplena?|Mele är plural: costano.
shopping|Vorrei mezzo ___ di pomodori.|chilo|Jag skulle vilja ha ett halvt kilo tomater.|Mezzo chilo = ett halvt kilo.
shopping|Posso ___ con la carta?|pagare|Kan jag betala med kort?|Pagare con la carta = betala med kort.
shopping|Avete una ___ più grande?|taglia|Har ni en större storlek? (kläder)|La taglia gäller klädstorlek.
shopping|Posso ___ questa giacca?|provare|Kan jag prova den här jackan?|Provare = prova.
shopping|Mi può dare lo ___?|scontrino|Kan ni ge mig kassakvittot?|Lo scontrino = kassakvitto.
shopping|Vorrei ___ questo prodotto.|restituire|Jag skulle vilja lämna tillbaka den här varan.|Restituire = lämna tillbaka.
shopping|Avete un ___?|sacchetto|Har ni en påse?|Un sacchetto = en påse.
shopping|È troppo ___.|caro|Den är för dyr (maskulint).|Troppo caro = för dyr.
shopping|A che ora ___?|chiudete|Vilken tid stänger ni?|Chiudere: voi chiudete.
shopping|Sto solo ___, grazie.|guardando|Jag tittar bara, tack.|Stare + gerundium: sto guardando.
shopping|Vorrei un ___.|rimborso|Jag skulle vilja ha en återbetalning.|Un rimborso = en återbetalning.
travel|Un biglietto di andata e ___, per favore.|ritorno|En tur- och returbiljett, tack.|Andata e ritorno = tur och retur.
travel|Da quale ___ parte il treno?|binario|Från vilket spår avgår tåget?|Il binario = järnvägsspåret.
travel|Il treno è in ___.|ritardo|Tåget är försenat.|Essere in ritardo = vara försenad.
travel|Dobbiamo ___ treno?|cambiare|Måste vi byta tåg?|Cambiare treno = byta tåg.
travel|Dove posso ___ la macchina?|parcheggiare|Var kan jag parkera bilen?|Parcheggiare = parkera.
travel|Devo ___ il biglietto?|convalidare|Måste jag validera biljetten?|Convalidare = validera.
travel|Vorrei fare il ___ di benzina.|pieno|Jag skulle vilja tanka fullt med bensin.|Fare il pieno = tanka fullt.
travel|La macchina non ___.|parte|Bilen startar inte.|Partire används också när ett fordon startar.
travel|Può chiamare un ___?|meccanico|Kan ni ringa en bilmekaniker?|Un meccanico = en bilmekaniker.
travel|È possibile andare a ___?|piedi|Går det att gå till fots?|A piedi är ett fast uttryck.
travel|Giri a ___ al semaforo.|destra|Sväng höger vid trafikljuset.|A destra = till höger.
travel|Vada sempre ___.|dritto|Fortsätt rakt fram (artigt).|Sempre dritto = rakt fram hela vägen.
health|Non mi ___ bene.|sento|Jag mår inte bra.|Sentirsi: mi sento.
health|Ho mal di ___.|testa|Jag har huvudvärk.|Avere mal di testa = ha huvudvärk.
health|Mi fa ___ il tallone.|male|Jag har ont i hälen.|Fare male = göra ont.
health|Ho la ___ da ieri.|febbre|Jag har haft feber sedan i går.|Da ieri beskriver något som fortfarande pågår.
health|Vorrei prendere un ___ con il medico.|appuntamento|Jag skulle vilja boka en tid hos läkaren.|Prendere un appuntamento = boka en tid.
health|Serve la ___ per questo farmaco?|ricetta|Behövs recept för det här läkemedlet?|Ricetta betyder både matrecept och läkarrecept.
health|Quante volte al ___?|giorno|Hur många gånger om dagen?|Al giorno = per dag.
health|Dove si trova la ___ più vicina?|farmacia|Var ligger närmaste apotek?|La farmacia = apoteket.
health|Ho bisogno di un'___.|ambulanza|Jag behöver en ambulans.|Ambulanza är feminint: un’ambulanza.
health|Prendo già questo ___.|farmaco|Jag tar redan det här läkemedlet.|Prendere un farmaco = ta ett läkemedel.
health|Sono ___ alla penicillina.|allergica|Jag är allergisk mot penicillin (en kvinna talar).|Allergica är feminin singular.
health|Il dolore è ___ qui.|forte|Smärtan är stark här.|Dolore är maskulint; forte har samma singularform för båda genus.
admin|Vorrei fissare un ___.|appuntamento|Jag skulle vilja boka en tid.|Fissare un appuntamento = boka en tid.
admin|Quali ___ servono?|documenti|Vilka dokument behövs?|Documento → documenti.
admin|Dove devo ___?|firmare|Var ska jag skriva under?|Firmare = skriva under.
admin|Può aiutarmi a ___ questo modulo?|compilare|Kan ni hjälpa mig att fylla i den här blanketten?|Compilare un modulo = fylla i en blankett.
admin|Vorrei richiedere il codice ___.|fiscale|Jag skulle vilja ansöka om italienskt skattenummer.|Codice fiscale är Italiens skatteidentifikationskod.
admin|Vorrei trasferire la ___.|residenza|Jag skulle vilja flytta min folkbokföring.|La residenza = folkbokföringsadress eller hemvist.
admin|Quando ___ questo documento?|scade|När går den här handlingen ut?|Scadere: scade.
admin|Vorrei fare un ___.|bonifico|Jag skulle vilja göra en banköverföring.|Fare un bonifico = göra en banköverföring.
admin|Può mandarmi una ___ della fattura?|copia|Kan ni skicka mig en kopia av fakturan?|Una copia della fattura = en fakturakopia.
admin|Devo ___ il contratto?|rinnovare|Måste jag förnya avtalet?|Rinnovare = förnya.
admin|Qual è la ___ della pratica?|scadenza|Vad är sista datum för ärendet?|La scadenza = sista datum eller förfallodag.
admin|Vorrei parlare con un ___.|funzionario|Jag skulle vilja tala med en tjänsteman.|Un funzionario = en tjänsteman.
work|Avete una ___?|prenotazione|Har ni en bokning?|Una prenotazione = en bokning.
work|La vostra camera è ___.|pronta|Ert rum är klart.|Camera är feminint: pronta.
work|La colazione è ___ nel prezzo.|inclusa|Frukosten ingår i priset.|Colazione är feminint: inclusa.
work|La password è ___ sul foglio.|scritta|Lösenordet står skrivet på pappret.|Password är feminint på italienska: scritta.
work|A che ora ___ di arrivare?|pensate|Vilken tid tänker ni komma?|Pensate di + infinitiv.
work|Potete lasciare i ___ qui.|bagagli|Ni kan lämna bagaget här.|Bagaglio → bagagli.
work|Il parcheggio è ___.|gratuito|Parkeringen är gratis.|Parcheggio är maskulint: gratuito.
work|La piscina è ___ fino alle otto.|aperta|Poolen är öppen till klockan åtta.|Piscina är feminint: aperta.
work|Vi auguriamo un buon ___.|soggiorno|Vi önskar er en trevlig vistelse.|Buon soggiorno = trevlig vistelse.
work|Può mandarmi un'___?|email|Kan ni skicka mig ett mejl?|Email är feminint: un’email.
work|La connessione non ___.|funziona|Anslutningen fungerar inte.|Funzionare: funziona.
work|Abbiamo una ___ alle dieci.|riunione|Vi har ett möte klockan tio.|Una riunione = ett arbetsmöte.
town|Dov'è l'ufficio ___?|postale|Var är postkontoret?|L’ufficio postale = postkontoret.
town|C'è un supermercato qui ___?|vicino|Finns det en mataffär här i närheten?|Qui vicino = här i närheten.
town|Quanto dista il centro ___?|storico|Hur långt är det till den historiska stadskärnan?|Il centro storico = den historiska stadskärnan.
town|A che ora apre il ___?|mercato|Vilken tid öppnar marknaden?|Il mercato = marknaden.
town|Dove si comprano i ___?|francobolli|Var köper man frimärken?|Il francobollo → i francobolli.
town|C'è una ___ aperta oggi?|ferramenta|Finns det en järnhandel som är öppen i dag?|La ferramenta = järnhandeln.
town|La biblioteca è ___ alla scuola.|accanto|Biblioteket ligger bredvid skolan.|Accanto a: a + la = alla.
town|Quanto ci ___ a piedi?|vuole|Hur lång tid tar det till fots?|Quanto ci vuole? = hur lång tid tar det?
nature|Che ___ fa domani?|tempo|Hur blir vädret i morgon?|Che tempo fa? frågar efter vädret.
nature|Oggi ___ molto caldo.|fa|I dag är det mycket varmt.|Om vädret säger man fa caldo.
nature|C'è un ___ facile qui vicino?|sentiero|Finns det en lätt vandringsled i närheten?|Un sentiero = en stig eller vandringsled.
nature|Quante ___ ci vogliono?|ore|Hur många timmar tar det?|Ora → ore.
nature|È prevista ___ nel pomeriggio.|pioggia|Regn väntas under eftermiddagen.|Pioggia är feminint: prevista.
nature|Vorrei ___ questi pomodori.|piantare|Jag skulle vilja plantera de här tomaterna.|Piantare = plantera.
nature|Bisogna ___ l'orto.|annaffiare|Man behöver vattna köksträdgården.|Bisogna + infinitiv.
nature|È una bellissima ___.|giornata|Det är en jättefin dag.|Una bellissima giornata = en jättefin dag.
time|Ci vediamo ___ mattina.|domani|Vi ses i morgon bitti.|Domani mattina = i morgon bitti.
time|A che ___ ci incontriamo?|ora|Vilken tid träffas vi?|A che ora? = vilken tid?
time|Sono le otto e ___.|mezza|Klockan är halv nio.|Otto e mezza = åtta och en halv.
time|Arriviamo ___ dieci minuti.|tra;fra|Vi kommer om tio minuter.|Tra/fra + tid = om en viss tid.
time|Siamo qui ___ due settimane.|da|Vi har varit här i två veckor (och är kvar).|Da + tidslängd med presens beskriver något som fortsätter.
time|Il negozio è chiuso il ___.|lunedì|Affären är stängd på måndagar.|Il lunedì = varje måndag.
time|Torniamo la settimana ___.|prossima|Vi kommer tillbaka nästa vecka.|Settimana är feminint: prossima.
time|Ho ___ poco tempo.|davvero;veramente|Jag har verkligen lite tid.|Davvero = verkligen.
connect|Vorrei un caffè ___ latte.|senza|Jag skulle vilja ha en kaffe utan mjölk.|Senza = utan.
connect|Vengo ___ te.|con|Jag följer med dig.|Con te = med dig.
connect|Non capisco, ___ sto imparando.|ma|Jag förstår inte, men jag håller på att lära mig.|Ma = men.
connect|Preferisco questo ___ è più piccolo.|perché|Jag föredrar den här eftersom den är mindre.|Perché kan betyda varför eller eftersom.
connect|___ costa troppo, non lo compro.|Se|Om den kostar för mycket köper jag den inte.|Se = om i ett villkor.
connect|Prima mangiamo, ___ partiamo.|poi|Först äter vi, sedan åker vi.|Prima … poi … = först … sedan …
connect|È aperto ___ la domenica?|anche|Är det öppet även på söndagar?|Anche = också eller även.
connect|Non qui, ___ a destra.|ma|Inte här, utan till höger.|Ma kan motsvara utan efter en negation.
`;
export const phraseEntries=rows.trim().split('\n').map(line=>{const [topic,it,answers,sv,note]=line.split('|');return {topic,it,answers:answers.split(';'),sv,note};});
