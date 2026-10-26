// Original, curated Swedish glosses. IDs derive from lemmas, never row positions.
export const vocabularyTopics = [
 ['people','Människor & samtal','Presentera er, småprata och lär känna grannarna.'],
 ['home','Hemma & boende','Rum, möbler, huset och kontakter med hantverkare.'],
 ['food','Mat & restaurang','Handla råvaror, beställ och prata om maten.'],
 ['shopping','Affärer & pengar','Kläder, betalning, leveranser och reklamationer.'],
 ['travel','Resor & transport','Hitta rätt, köp biljetter och prata om bilen.'],
 ['health','Kroppen & vården','Beskriv hur ni mår och förstå vanliga vårdord.'],
 ['admin','Myndigheter & ärenden','Boka tider, fråga om dokument och reda ut avtal.'],
 ['work','Arbete & gäster','Arbetsliv, teknik och att ta emot B&B-gäster.'],
 ['town','I byn & staden','Platser, service och livet i närområdet.'],
 ['nature','Natur & fritid','Väder, trädgård, vandring och lediga dagar.'],
 ['time','Tid & planering','Dagar, tider, antal och vardagens rutiner.'],
 ['actions','Vardagens verb','Verben som hjälper er att göra er förstådda.'],
 ['descriptions','Beskriv människor & saker','Egenskaper, känslor, färger och jämförelser.'],
 ['connect','Ord som binder ihop','Frågor, småord och vanliga beskrivningar.']
].map(([id,title,description])=>({id,title,description}));

const groups = [];
function group(topic,pos,source){for(const line of source.trim().split('\n')){const [it,sv]=line.trim().split('|');if(it&&sv)groups.push({topic,pos,it,sv:sv.split(';')});}}
group('people','noun',`
la persona|person
la gente|folk;människor
la famiglia|familj
il padre|far;pappa
la madre|mor;mamma
il figlio|son
la figlia|dotter
il fratello|bror
la sorella|syster
il marito|make;man
la moglie|fru;hustru
il compagno|partner (man);sambo (man)
la compagna|partner (kvinna);sambo (kvinna)
il nonno|morfar;farfar
la nonna|mormor;farmor
lo zio|farbror;morbror
la zia|faster;moster
il cugino|kusin (man)
la cugina|kusin (kvinna)
il nipote|barnbarn eller syskonbarn (pojke)
la nipote|barnbarn eller syskonbarn (flicka)
il bambino|barn (pojke)
la bambina|barn (flicka)
il neonato|nyfött barn
il genitore|förälder
il parente|släkting
il vicino|granne (man)
la vicina|granne (kvinna)
il conoscente|bekant (man)
la conoscente|bekant (kvinna)
il collega|kollega (man)
la collega|kollega (kvinna)
il signore|herre
la signora|dam;fru
il nome|förnamn;namn
il cognome|efternamn
l'età|ålder
la nazionalità|nationalitet
la lingua|språk;tunga
la parola|ord
la frase|mening (språklig);fras
la domanda|fråga
la risposta|svar
la conversazione|samtal
la notizia|nyhet
la storia|historia;berättelse
la vita|liv
la morte|död
l'amore|kärlek
l'amicizia|vänskap
la felicità|lycka
la paura|rädsla
la sorpresa|överraskning
il sorriso|leende
la voce|röst
il carattere|karaktär;personlighet
il sentimento|känsla
il rapporto|relation;förhållande
la coppia|par
il matrimonio|äktenskap;bröllop
la festa|fest
l'invito|inbjudan
il regalo|present;gåva
il compleanno|födelsedag
l'ospite|gäst
l'uomo|man
la donna|kvinna
il ragazzo|pojke;kille
la ragazza|flicka;tjej
l'amico|vän (man)
l'amica|vän (kvinna)
`);
group('home','noun',`
la casa|hus;hem
l'appartamento|lägenhet
l'abitazione|bostad
la stanza|rum
la camera|sovrum;rum
la cucina|kök
il soggiorno|vardagsrum;vistelse
il salotto|salong;vardagsrum
il bagno|badrum
il corridoio|korridor
l'ingresso|entré;ingång
la scala|trappa;stege
il piano|våning;plan
il pianterreno|bottenvåning
il tetto|tak (yttertak)
il soffitto|tak (innertak)
il pavimento|golv
il muro|mur;vägg
la parete|vägg (innervägg)
la finestra|fönster
la porta|dörr
il cancello|grind
il balcone|balkong
la terrazza|terrass
il cortile|innergård;gårdsplan
il giardino|trädgård
il garage|garage
la cantina|källare;vinkällare
la soffitta|vind (i hus)
il ripostiglio|förråd
la chiave|nyckel
la serratura|lås
il campanello|dörrklocka
il citofono|porttelefon
il letto|säng
il materasso|madrass
il cuscino|kudde
la coperta|filt
il lenzuolo|lakan
il piumone|täcke
l'armadio|garderob;skåp
il cassetto|låda (i möbel)
la cassettiera|byrå (möbel)
il tavolo|bord
la sedia|stol
il divano|soffa
la poltrona|fåtölj
lo scaffale|hylla
lo specchio|spegel
la lampada|lampa
il tappeto|matta
la tenda|gardin;tält
il quadro|tavla
il comodino|nattduksbord
la presa|eluttag
l'interruttore|strömbrytare
la luce|ljus;belysning
l'elettricità|elektricitet
il gas|gas
il riscaldamento|uppvärmning
il termosifone|element (värme)
la caldaia|värmepanna
il condizionatore|luftkonditioneringsapparat
il rubinetto|kran (vatten)
il lavandino|handfat
la doccia|dusch
la vasca|badkar
il gabinetto|toalett (wc)
l'asciugamano|handduk
il sapone|tvål
la lavatrice|tvättmaskin
la lavastoviglie|diskmaskin
il frigorifero|kylskåp
il congelatore|frys
il forno|ugn
il fornello|spisplatta
il microonde|mikrovågsugn
il lavello|diskho
la pentola|kastrull;gryta
la padella|stekpanna
il coperchio|lock
il piatto|tallrik;maträtt
il bicchiere|glas (att dricka ur)
la tazza|kopp
la forchetta|gaffel
il coltello|kniv
il cucchiaio|sked
il cucchiaino|tesked
la tovaglia|bordsduk
il tovagliolo|servett
la spugna|svamp (rengöring)
la scopa|sopborste;kvast
l'aspirapolvere|dammsugare
il detersivo|rengöringsmedel;tvättmedel
il secchio|hink
il sacco|säck
la spazzatura|sopor
il riciclaggio|återvinning
la raccolta differenziata|sopsortering
il tubo|rör;slang
la perdita|läcka;förlust
l'umidità|fukt
la muffa|mögel
la crepa|spricka
la riparazione|reparation
la manutenzione|underhåll
la ristrutturazione|renovering
il preventivo|offert;kostnadsförslag
il muratore|murare
l'idraulico|rörmokare
l'elettricista|elektriker
il falegname|snickare
il tecnico|tekniker
il proprietario|ägare;hyresvärd
l'inquilino|hyresgäst
l'affitto|hyra
il trasloco|flytt
il terreno|mark;tomt
il confine|gräns
la recinzione|staket;inhägnad
il pozzo|brunn
la fossa biologica|septiktank
il pannello solare|solpanel
`);
group('food','noun',`
il cibo|mat
il pasto|måltid
la colazione|frukost
il pranzo|lunch
la cena|middag
lo spuntino|mellanmål
il pane|bröd
il panino|smörgås;fralla
la farina|mjöl
la pasta|pasta
il riso|ris
la patata|potatis
il pomodoro|tomat
la cipolla|lök
l'aglio|vitlök
la carota|morot
la zucchina|zucchini
la melanzana|aubergine
il peperone|paprika
il cetriolo|gurka
la lattuga|sallad (växt)
l'insalata|sallad (rätt)
il cavolo|kål
il cavolfiore|blomkål
il broccolo|broccoli
lo spinacio|spenat
il fungo|svamp (mat)
il pisello|ärta
il fagiolo|böna
la lenticchia|lins (baljväxt)
il cece|kikärta
la verdura|grönsaker
la frutta|frukt
la mela|äpple
la pera|päron
la banana|banan
l'arancia|apelsin
il limone|citron
il mandarino|mandarin
la pesca|persika
l'albicocca|aprikos
la ciliegia|körsbär
la fragola|jordgubbe
il lampone|hallon
il mirtillo|blåbär
l'uva|druvor;vindruvor
il melone|melon
l'anguria|vattenmelon
il fico|fikon
la noce|valnöt
la mandorla|mandel
la nocciola|hasselnöt
l'oliva|oliv
l'olio|olja
il burro|smör
il latte|mjölk
la panna|grädde
lo yogurt|yoghurt
il formaggio|ost
la ricotta|ricotta
la mozzarella|mozzarella
l'uovo|ägg
la carne|kött
il manzo|nötkött
il maiale|fläskkött;gris
il pollo|kyckling
il tacchino|kalkon
l'agnello|lamm
il prosciutto|skinka
la salsiccia|korv (italiensk färskkorv)
il salame|salami
il pesce|fisk
il salmone|lax
il tonno|tonfisk
il merluzzo|torsk
il gambero|räka
la cozza|mussla (blåmussla)
la vongola|vongolamussla
il calamaro|bläckfisk (kalmar)
il polpo|bläckfisk (åttaarmad)
il sale|salt
il pepe|peppar
lo zucchero|socker
il miele|honung
l'aceto|vinäger
il basilico|basilika
il prezzemolo|persilja
il rosmarino|rosmarin
la salvia|salvia
l'origano|oregano
il peperoncino|chili
la salsa|sås
il sugo|pastasås
il brodo|buljong
la zuppa|soppa
il dolce|efterrätt;bakverk
la torta|tårta;kaka
il biscotto|kex;småkaka
il gelato|glass
il cioccolato|choklad
la marmellata|marmelad
l'acqua|vatten
il vino|vin
la birra|öl
il succo|juice
il tè|te
il caffè|kaffe
la bottiglia|flaska
la caraffa|karaff
il menù|meny
il conto|nota;räkning (restaurang)
il coperto|kuvertavgift
la mancia|dricks
l'antipasto|förrätt
il primo|första huvudrätt (pasta eller ris)
il secondo|andra huvudrätt (kött eller fisk)
il contorno|tillbehör (mat)
la porzione|portion
la ricetta|recept
l'ingrediente|ingrediens
il gusto|smak
la fame|hunger
la sete|törst
`);
group('shopping','noun',`
il negozio|affär;butik
il supermercato|stormarknad;mataffär
il mercato|marknad
la spesa|matinköp;utgift
il carrello|kundvagn
il cestino|korg;papperskorg
la cassa|kassa
lo scontrino|kvitto (kassakvitto)
la ricevuta|kvitto;betalningsbekräftelse
il prezzo|pris
lo sconto|rabatt
l'offerta|erbjudande
il saldo|saldo;rea
il denaro|pengar
i soldi|pengar (vardagligt)
il contante|kontanter
la moneta|mynt
la banconota|sedel
il resto|växel;resten
il pagamento|betalning
la carta di credito|kreditkort
la carta di debito|bankkort;betalkort
il bancomat|bankomat
il portafoglio|plånbok
la borsa|väska
il sacchetto|påse
la confezione|förpackning
il pacco|paket
la scatola|låda;ask
la consegna|leverans
la spedizione|frakt;försändelse
il reso|retur (vara)
il rimborso|återbetalning
la garanzia|garanti
la taglia|storlek (kläder)
il numero|nummer;storlek (skor)
il colore|färg
il vestito|klänning;kostym;plagg
la maglietta|t-shirt
la camicia|skjorta
il maglione|tröja
la giacca|jacka;kavaj
il cappotto|kappa;överrock
i pantaloni|byxor
la gonna|kjol
la scarpa|sko
lo stivale|stövel
il calzino|strumpa
la biancheria|underkläder;linne
la cintura|bälte
il cappello|hatt;mössa
il guanto|handske
la sciarpa|halsduk
l'ombrello|paraply
l'orologio|klocka (föremål)
l'anello|ring (smycke)
gli occhiali|glasögon
il cotone|bomull
la lana|ull
la seta|siden
la pelle|läder;hud
il tessuto|tyg
il prodotto|produkt
la marca|märke (varumärke)
la qualità|kvalitet
il peso|vikt
il chilo|kilo
il grammo|gram
il litro|liter
la metà|hälften
il pezzo|stycke;bit
la fila|kö;rad
il turno|tur;arbetspass
`);
group('travel','noun',`
il viaggio|resa
la vacanza|semester
la partenza|avresa
l'arrivo|ankomst
il ritorno|återresa;återkomst
la destinazione|resmål;destination
il percorso|rutt;sträcka
la direzione|riktning
la strada|väg;gata
la via|gata;väg
l'incrocio|korsning
la rotonda|rondell
il semaforo|trafikljus
il marciapiede|trottoar
l'attraversamento|övergång;passage
il ponte|bro
la galleria|tunnel;galleri
l'autostrada|motorväg
il casello|betalstation (motorväg)
il pedaggio|vägavgift
il parcheggio|parkering
il posto|plats
il divieto|förbud
il limite|gräns (begränsning)
la velocità|hastighet
il traffico|trafik
la coda|bilkö;svans
l'auto|bil
la macchina|bil;maskin
il volante|ratt
il freno|broms
la ruota|hjul
lo pneumatico|däck
il motore|motor
la batteria|batteri
la benzina|bensin
il gasolio|diesel
il carburante|bränsle
il distributore|bensinstation;automat
l'officina|bilverkstad;verkstad
il meccanico|bilmekaniker
il guasto|fel (tekniskt);haveri
l'incidente|olycka
la patente|körkort
l'assicurazione|försäkring
il noleggio|uthyrning;hyrning
il treno|tåg
l'autobus|buss
la fermata|hållplats
la stazione|station
il binario|spår (järnväg)
il biglietto|biljett
l'abbonamento|periodkort;abonnemang
la coincidenza|anslutning (resa)
il ritardo|försening
la cancellazione|inställning;avbokning
il controllore|biljettkontrollant
il passeggero|passagerare
il sedile|säte
il finestrino|fönster (i fordon)
il bagaglio|bagage
la valigia|resväska
lo zaino|ryggsäck
l'aereo|flygplan
l'aeroporto|flygplats
il volo|flyg;flygning
l'imbarco|ombordstigning
il passaporto|pass
il traghetto|färja
la nave|fartyg
la barca|båt
la bicicletta|cykel
il casco|hjälm
la mappa|karta
l'indirizzo|adress
la distanza|avstånd
il chilometro|kilometer
il metro|meter
la valvola|ventil
`);
group('health','noun',`
il corpo|kropp
la testa|huvud
il viso|ansikte
l'occhio|öga
l'orecchio|öra
il naso|näsa
la bocca|mun
il dente|tand
il labbro|läpp
la gola|hals (svalg)
il collo|hals;nacke
la spalla|axel
il braccio|arm
il gomito|armbåge
il polso|handled;puls
la mano|hand
il dito|finger;tå
la schiena|rygg
il petto|bröst
il cuore|hjärta
il polmone|lunga
lo stomaco|mage (magsäck)
la pancia|mage;buk
l'intestino|tarm
il fegato|lever
il rene|njure
l'anca|höft
la gamba|ben (kroppsdel)
il ginocchio|knä
la caviglia|fotled
il piede|fot
il tallone|häl
l'osso|ben (skelett)
il muscolo|muskel
il sangue|blod
la salute|hälsa
la malattia|sjukdom
il dolore|smärta;värk
la febbre|feber
la tosse|hosta
il raffreddore|förkylning
l'influenza|influensa
l'allergia|allergi
il sintomo|symtom
la ferita|sår
il gonfiore|svullnad
la nausea|illamående
il capogiro|yrsel
la stanchezza|trötthet
il sonno|sömn
il riposo|vila
il medico|läkare
il dottore|doktor;läkare
il dentista|tandläkare
l'infermiere|sjuksköterska (man)
l'infermiera|sjuksköterska (kvinna)
la farmacia|apotek
l'ospedale|sjukhus
il pronto soccorso|akutmottagning
l'ambulanza|ambulans
la visita|läkarbesök;besök
l'appuntamento|bokad tid;möte
la cura|behandling;vård
la medicina|medicin
il farmaco|läkemedel
la compressa|tablett (medicin)
la dose|dos
la pomata|salva
il cerotto|plåster
la benda|bandage
la pressione|blodtryck;tryck
l'esame|undersökning;prov
l'analisi|analys
il risultato|resultat
la tessera sanitaria|sjukvårdskort
`);
group('admin','noun',`
il documento|dokument;id-handling
la carta d'identità|identitetskort;id-kort
il codice fiscale|italienskt skattenummer
la residenza|folkbokföringsadress;hemvist
il domicilio|vistelseadress;domicil
il permesso|tillstånd
la richiesta|begäran;ansökan
il modulo|blankett;formulär
la firma|underskrift;signatur
la copia|kopia
l'originale|original
il certificato|intyg
l'iscrizione|registrering;anmälan
la registrazione|registrering;inspelning
la scadenza|sista datum;förfallodag
il rinnovo|förnyelse
la tassa|avgift;skatt
l'imposta|skatt
la dichiarazione|deklaration;förklaring
il reddito|inkomst
la pensione|pension
il contributo|bidrag;avgiftsinbetalning
la pratica|ärende;praktik
il protocollo|diarienummer;protokoll
lo sportello|expedition;kunddisk
il funzionario|tjänsteman
il comune|kommun
il municipio|kommunhus;rådhus
l'anagrafe|folkbokföringskontor
la questura|polishögkvarter
il consolato|konsulat
l'ambasciata|ambassad
la regione|region
la provincia|provins
lo stato|stat;skick
il governo|regering
la legge|lag
la regola|regel
il diritto|rättighet;juridik
il dovere|skyldighet
la multa|böter
il contratto|avtal;kontrakt
la clausola|avtalsklausul
la disdetta|uppsägning (avtal)
la bolletta|räkning (el eller vatten)
la fattura|faktura
il bonifico|banköverföring
il conto corrente|bankkonto
il conto bancario|bankkonto
il tasso|räntesats;taxa
il prestito|lån
il mutuo|bolån
il debito|skuld
il credito|kredit;tillgodohavande
il risparmio|sparande;besparing
la banca|bank
il notaio|notarie
il commercialista|italiensk redovisnings- och skatterådgivare
l'avvocato|advokat
il geometra|byggnadsteknisk konsult (geometra)
l'architetto|arkitekt
il permesso di costruire|bygglov
la planimetria|planritning
il catasto|fastighetsregister
la proprietà|äganderätt;egendom
la procura|fullmakt
la delega|fullmakt (för ett ärende)
il reclamo|klagomål;reklamation
l'assistenza|support;hjälp
il servizio|tjänst;service
`);
group('work','noun',`
il lavoro|arbete;jobb
la professione|yrke
il mestiere|yrke;hantverk
l'azienda|företag
la ditta|firma;företag
l'impresa|företag;verksamhet
l'ufficio|kontor
il capo|chef
il dipendente|anställd
il datore di lavoro|arbetsgivare
il cliente|kund
il fornitore|leverantör
il socio|delägare;medlem
lo stipendio|lön
il compenso|arvode;ersättning
l'orario|tidsplan;arbetstid
la pausa|paus;rast
la riunione|möte (arbetsmöte)
il progetto|projekt
il compito|uppgift
l'obiettivo|mål (syfte)
la proposta|förslag
la decisione|beslut
la soluzione|lösning
il problema|problem
l'errore|fel;misstag
il consiglio|råd
l'esperienza|erfarenhet;upplevelse
la formazione|utbildning
la competenza|kompetens
il computer|dator
il portatile|bärbar dator
lo schermo|skärm
la tastiera|tangentbord
il mouse|datormus
il telefono|telefon
il cellulare|mobiltelefon
la chiamata|telefonsamtal
il messaggio|meddelande
la posta|post
l'email|e-postmeddelande
la password|lösenord
la rete|nätverk;nät
la connessione|anslutning (internet)
il sito|webbplats;plats
il programma|program
il file|fil (dator)
la cartella|mapp
la stampante|skrivare
la prenotazione|bokning
la disponibilità|tillgänglighet
la conferma|bekräftelse
l'acconto|förskottsbetalning
il deposito|deposition;lager
la cauzione|säkerhetsdeposition
la tariffa|prislista;taxa
la stagione|säsong;årstid
il pernottamento|övernattning
la pulizia|städning;renhet
il cambio|byte;växling
la biancheria da letto|sänglinne
il supplemento|tilläggsavgift
il regolamento|ordningsregler;regelverk
la recensione|recension
il soggiorno minimo|minsta vistelse
la tassa di soggiorno|turistskatt
la piscina|pool
il parcheggio privato|privat parkering
`);
group('town','noun',`
il paese|by;land
la città|stad
il centro|centrum
il quartiere|stadsdel
la periferia|utkant;förort
la piazza|torg
il vicolo|gränd
il viale|aveny;allé
il palazzo|större byggnad;palats
l'edificio|byggnad
la chiesa|kyrka
il duomo|domkyrka
il castello|slott
la torre|torn
il monumento|monument
il museo|museum
la biblioteca|bibliotek
la libreria|bokhandel;bokhylla
la scuola|skola
l'università|universitet
l'asilo|förskola
il parco|park
il ristorante|restaurang
la trattoria|enkel italiensk restaurang
la pizzeria|pizzeria
il bar|bar;kafé (italiensk bar)
il panificio|bageri
la panetteria|brödbutik;bageri
la pasticceria|konditori
la macelleria|köttbutik
la pescheria|fiskbutik
la tabaccheria|tobaks- och servicebutik
la ferramenta|järnhandel
la lavanderia|tvätteri
il parrucchiere|frisör
il barbiere|barberare
l'edicola|tidningskiosk
l'ufficio postale|postkontor
la polizia|polis (myndighet)
il carabiniere|karabinjär
il vigile|kommunpolis
il pompiere|brandman
il cimitero|kyrkogård
il porto|hamn
il lungomare|strandpromenad
il centro storico|historisk stadskärna
il turista|turist
il residente|invånare;boende
il sindaco|borgmästare
il cittadino|medborgare
`);
group('nature','noun',`
la natura|natur
il paesaggio|landskap
la campagna|landsbygd
la montagna|berg
la collina|kulle
la valle|dal
il bosco|skog
la foresta|skog (stor)
l'albero|träd
il ramo|gren
la foglia|löv;blad
la radice|rot
il fiore|blomma
la pianta|växt
l'erba|gräs
il seme|frö
la terra|jord;jorden
il campo|fält;åker
l'orto|köksträdgård
la serra|växthus
il raccolto|skörd
il concime|gödsel
il vigneto|vingård (odling)
l'ulivo|olivträd
il sentiero|stig;vandringsled
la passeggiata|promenad
l'escursione|utflykt;vandring
la salita|uppförsbacke;uppstigning
la discesa|nedförsbacke;nedstigning
la cima|topp (berg)
il rifugio|fjällstuga;skydd
la funivia|linbana
il panorama|utsikt;panorama
il lago|sjö
il fiume|flod
il torrente|bäck;fors
il ruscello|liten bäck
la cascata|vattenfall
il mare|hav
la spiaggia|strand
la costa|kust
l'isola|ö
la sabbia|sand
il sasso|sten
la roccia|klippa;berg (material)
il cielo|himmel
il sole|sol
la luna|måne
la stella|stjärna
la nuvola|moln
la pioggia|regn
la neve|snö
il vento|vind
il temporale|åskväder
il tuono|åska;åskknall
il fulmine|blixt
la nebbia|dimma
il ghiaccio|is
il caldo|värme;hetta
il freddo|kyla
la temperatura|temperatur
il clima|klimat
l'ombra|skugga
il tramonto|solnedgång
l'alba|gryning
l'animale|djur
il cane|hund
il gatto|katt
l'uccello|fågel
il cavallo|häst
la mucca|ko
la pecora|får
la capra|get
il cinghiale|vildsvin
la volpe|räv
il lupo|varg
l'orso|björn
l'insetto|insekt
la zanzara|mygga
l'ape|bi
la vespa|geting
la mosca|fluga
la farfalla|fjäril
il ragno|spindel
lo sport|idrott;sport
la corsa|löpning;lopp
il nuoto|simning
la palestra|gym;idrottshall
la partita|match
la musica|musik
la canzone|sång;låt
il concerto|konsert
il cinema|biograf;filmkonst
il teatro|teater
il film|film
la fotografia|fotografi;foto
il libro|bok
il giornale|tidning (dagstidning)
la rivista|tidskrift
il gioco|spel;lek
il divertimento|nöje
`);
group('time','noun',`
il tempo|tid;väder
il momento|ögonblick;stund
l'ora|timme;klockslag
il minuto|minut
il secondo|sekund
il giorno|dag
la giornata|dag (som tidsförlopp)
la mattina|morgon;förmiddag
il mezzogiorno|middag (klockan tolv)
il pomeriggio|eftermiddag
la sera|kväll
la notte|natt
la mezzanotte|midnatt
la settimana|vecka
il fine settimana|helg
il mese|månad
l'anno|år
la data|datum
il calendario|kalender
il lunedì|måndag
il martedì|tisdag
il mercoledì|onsdag
il giovedì|torsdag
il venerdì|fredag
il sabato|lördag
la domenica|söndag
la primavera|vår (årstid)
l'estate|sommar
l'autunno|höst
l'inverno|vinter
gennaio|januari
febbraio|februari
marzo|mars
aprile|april
maggio|maj
giugno|juni
luglio|juli
agosto|augusti
settembre|september
ottobre|oktober
novembre|november
dicembre|december
il futuro|framtid
il passato|förfluten tid;det förflutna
il presente|nutid
la fretta|brådska
il programma del giorno|dagens program
il promemoria|påminnelse
`);
group('connect','other',`
sì|ja
no|nej
non|inte
forse|kanske
anche|också
neanche|inte heller
ancora|fortfarande;ännu
già|redan
sempre|alltid
mai|aldrig
spesso|ofta
raramente|sällan
qualche volta|ibland
di solito|vanligtvis
ogni tanto|då och då
adesso|nu
ora|nu
subito|genast;direkt
presto|snart;tidigt
tardi|sent
prima|före;tidigare
dopo|efter;sedan
poi|sedan
oggi|i dag;idag
ieri|i går;igår
domani|i morgon;imorgon
dopodomani|i övermorgon
stasera|i kväll;ikväll
stamattina|i morse;den här morgonen
stanotte|i natt;inatt
qui|här
qua|här
lì|där
là|där
vicino|nära
lontano|långt borta
dentro|inne;inuti
fuori|ute;utanför
sopra|ovanför;ovanpå
sotto|under;nedanför
davanti|framför
dietro|bakom
accanto|bredvid
di fronte|mittemot
intorno|runt omkring
dappertutto|överallt
altrove|någon annanstans
insieme|tillsammans
separatamente|var för sig;separat
bene|bra
male|dåligt
meglio|bättre
peggio|sämre
molto|mycket
poco|lite
troppo|för mycket
abbastanza|tillräckligt;ganska
quasi|nästan
circa|ungefär
soltanto|bara;endast
solo|bara;endast
almeno|åtminstone
soprattutto|framför allt
proprio|just;precis
davvero|verkligen
veramente|verkligen
certamente|säkert;naturligtvis
sicuramente|säkert
probabilmente|förmodligen
magari|kanske;gärna (beroende på sammanhang)
purtroppo|tyvärr
fortunatamente|lyckligtvis
naturalmente|naturligtvis
ovviamente|självklart
facilmente|lätt (utan svårighet)
lentamente|långsamt
velocemente|snabbt
esattamente|exakt
completamente|helt;fullständigt
specialmente|särskilt
normalmente|normalt
finalmente|äntligen
comunque|hur som helst;ändå
invece|däremot;i stället
quindi|alltså;därför
allora|då;nåväl
infatti|faktiskt;ju
perciò|därför
però|men;dock
e|och
o|eller
ma|men
perché|varför;eftersom
quando|när
mentre|medan
se|om (villkor)
anche se|även om
che|att;som
come|hur;som
dove|var;vart
chi|vem
cosa|vad
quale|vilken
quanto|hur mycket
quanti|hur många (maskulin plural)
di|av;från (tillhörighet eller ursprung)
a|till;i (plats)
da|från;hos
in|i
con|med
senza|utan
per|för;till (syfte)
tra|mellan;om (tid framåt)
fra|mellan;om (tid framåt)
su|på
fino a|ända till
verso|mot;ungefär vid (tid)
durante|under (tidsperiod)
contro|mot;emot
secondo|enligt
attraverso|genom
io|jag
tu|du
lui|han
lei|hon;Ni (artigt tilltal)
noi|vi
voi|ni
loro|de
mi|mig;åt mig
ti|dig;åt dig
ci|oss;där
vi|er
si|sig;man (opersonligt)
ne|av det;därifrån
questo|den här;det här
quello|den där;det där
qualcosa|något
qualcuno|någon
niente|ingenting
nulla|ingenting
tutto|allt
ogni|varje
altro|annat;annan
stesso|samma
entrambi|båda (maskulint)
ciascuno|var och en
nessuno|ingen
alcuni|några (maskulin plural)
qualche|någon;några (med singular)
destra|höger
sinistra|vänster
dritto|rakt fram
indietro|bakåt;tillbaka
avanti|framåt
su e giù|upp och ner
uno|ett;en (räkneord)
due|två
tre|tre
quattro|fyra
cinque|fem
sei|sex (räkneord)
sette|sju
otto|åtta
nove|nio
dieci|tio
undici|elva
dodici|tolv
tredici|tretton
quattordici|fjorton
quindici|femton
sedici|sexton
diciassette|sjutton
diciotto|arton
diciannove|nitton
venti|tjugo
trenta|trettio
quaranta|fyrtio
cinquanta|femtio
sessanta|sextio
settanta|sjuttio
ottanta|åttio
novanta|nittio
cento|hundra
mille|tusen
grazie|tack
prego|varsågod
scusa|ursäkta (informellt)
scusi|ursäkta (artigt)
permesso|ursäkta, får jag komma förbi
ciao|hej;hejdå (informellt)
buongiorno|god morgon;god dag
buonasera|god kväll
buonanotte|god natt
arrivederci|adjö;hejdå
salve|hej (neutralt)
auguri|gratulerar;lyckönskningar
benvenuto|välkommen (till en man)
volentieri|gärna
peccato|synd
`);
// Infinitive | Swedish | conjugation group | participle | auxiliary | future stem (override).
const regularVerbRows=`
comprare|köpa|are|comprato|avere
vendere|sälja|ere|venduto|avere
costare|kosta|are|costato|essere
ordinare|beställa|are|ordinato|avere
prenotare|boka|are|prenotato|avere
chiamare|ringa;kalla|are|chiamato|avere
telefonare|ringa (per telefon)|are|telefonato|avere
ascoltare|lyssna|are|ascoltato|avere
guardare|titta|are|guardato|avere
aspettare|vänta|are|aspettato|avere
trovare|hitta|are|trovato|avere
lasciare|lämna|are|lasciato|avere
portare|ta med;bära|are|portato|avere
tornare|komma tillbaka;återvända|are|tornato|essere
restare|stanna kvar|are|restato|essere
entrare|gå in|are|entrato|essere
camminare|gå till fots;promenera|are|camminato|avere
nuotare|simma|are|nuotato|avere
viaggiare|resa|are|viaggiato|avere
guidare|köra (fordon)|are|guidato|avere
parcheggiare|parkera|are|parcheggiato|avere
attraversare|korsa;gå över|are|attraversato|avere
visitare|besöka|are|visitato|avere
incontrare|träffa|are|incontrato|avere
salutare|hälsa|are|salutato|avere
ringraziare|tacka|are|ringraziato|avere
scusare|ursäkta|are|scusato|avere
aiutare|hjälpa|are|aiutato|avere
spiegare|förklara|are|spiegato|avere
domandare|fråga|are|domandato|avere
raccontare|berätta|are|raccontato|avere
imparare|lära sig|are|imparato|avere
insegnare|undervisa;lära ut|are|insegnato|avere
studiare|studera|are|studiato|avere
provare|prova;försöka|are|provato|avere
usare|använda|are|usato|avere
pensare|tänka|are|pensato|avere
ricordare|komma ihåg|are|ricordato|avere
dimenticare|glömma|are|dimenticato|avere
sperare|hoppas|are|sperato|avere
desiderare|önska|are|desiderato|avere
amare|älska|are|amato|avere
odiare|hata|are|odiato|avere
preferire|föredra|isc|preferito|avere
servire|servera|ire|servito|avere
offrire|erbjuda;bjuda på|ire|offerto|avere
aprire|öppna|ire|aperto|avere
chiudere|stänga|ere|chiuso|avere
leggere|läsa|ere|letto|avere
scrivere|skriva|ere|scritto|avere
ricevere|ta emot;få|ere|ricevuto|avere
rispondere|svara|ere|risposto|avere
chiedere|fråga;be om|ere|chiesto|avere
credere|tro (på)|ere|creduto|avere
conoscere|känna till;känna (någon)|ere|conosciuto|avere
mettere|lägga;ställa;sätta|ere|messo|avere
perdere|förlora;tappa bort|ere|perso|avere
vivere|leva;bo|ere|vissuto|avere|vivr
cucinare|laga mat|are|cucinato|avere
preparare|förbereda;tillaga|are|preparato|avere
assaggiare|smaka på|are|assaggiato|avere
tagliare|skära;klippa|are|tagliato|avere
mescolare|blanda;röra om|are|mescolato|avere
aggiungere|lägga till|ere|aggiunto|avere
bollire|koka (vätska)|ire|bollito|avere
lavare|tvätta|are|lavato|avere
pulire|städa;rengöra|isc|pulito|avere
asciugare|torka (något)|are|asciugato|avere
stirare|stryka (kläder)|are|stirato|avere
riparare|reparera|are|riparato|avere
controllare|kontrollera|are|controllato|avere
cambiare|byta något;ändra något|are|cambiato|avere
accendere|tända;sätta på|ere|acceso|avere
spegnere|släcka;stänga av|ere|spento|avere
funzionare|fungera|are|funzionato|avere
mancare|saknas|are|mancato|essere
bisognare|behövas (opersonligt)|are|bisognato|essere
sembrare|verka;tyckas|are|sembrato|essere
diventare|bli|are|diventato|essere
continuare|fortsätta|are|continuato|avere
cominciare|börja (något)|are|cominciato|avere
iniziare|påbörja|are|iniziato|avere
terminare|avsluta|are|terminato|avere
fermare|stoppa (något)|are|fermato|avere
firmare|skriva under|are|firmato|avere
compilare|fylla i (blankett)|are|compilato|avere
registrare|registrera;spela in|are|registrato|avere
consegnare|lämna in;leverera|are|consegnato|avere
ritirare|hämta ut|are|ritirato|avere
spedire|skicka (försändelse)|isc|spedito|avere
stampare|skriva ut|are|stampato|avere
scaricare|ladda ner|are|scaricato|avere
caricare|ladda upp;lasta|are|caricato|avere
salvare|spara;rädda|are|salvato|avere
annullare|avboka;annullera|are|annullato|avere
confermare|bekräfta|are|confermato|avere
organizzare|ordna;organisera|are|organizzato|avere
decidere|bestämma|ere|deciso|avere
discutere|diskutera|ere|discusso|avere
spendere|spendera|ere|speso|avere
risparmiare|spara (pengar)|are|risparmiato|avere
guadagnare|tjäna (pengar)|are|guadagnato|avere
affittare|hyra;hyra ut|are|affittato|avere
traslocare|flytta (bostad)|are|traslocato|avere
abitare|bo|are|abitato|avere
costruire|bygga|isc|costruito|avere
ristrutturare|renovera|are|ristrutturato|avere
piantare|plantera|are|piantato|avere
coltivare|odla|are|coltivato|avere
annaffiare|vattna|are|annaffiato|avere
raccogliere|samla;skörda|irregular|raccolto|avere|raccoglier
campeggiare|campa|are|campeggiato|avere
giocare|spela;leka|are|giocato|avere
cantare|sjunga|are|cantato|avere
ballare|dansa|are|ballato|avere
suonare|spela (instrument);ringa (ljuda)|are|suonato|avere
fotografare|fotografera|are|fotografato|avere
disegnare|rita|are|disegnato|avere
dipendere|bero på|ere|dipeso|essere
succedere|hända|ere|successo|essere
permettere|tillåta|ere|permesso|avere
promettere|lova|ere|promesso|avere
proteggere|skydda|ere|protetto|avere
sentire|höra;känna|ire|sentito|avere
seguire|följa|ire|seguito|avere
salire|gå upp;stiga upp|irregular|salito|essere|salir
scendere|gå ner;stiga av|ere|sceso|essere
cadere|falla|ere|caduto|essere|cadr
piangere|gråta|ere|pianto|avere
ridere|skratta|ere|riso|avere
sorridere|le|ere|sorriso|avere
`;
const irregularPresent={
 raccogliere:['raccolgo','raccogli','raccoglie','raccogliamo','raccogliete','raccolgono'],
 salire:['salgo','sali','sale','saliamo','salite','salgono'],
 spegnere:['spengo','spegni','spegne','spegniamo','spegnete','spengono']
};
function regularPresent(inf,kind){
 const stem=inf.slice(0,-3),endings=kind==='are'?['o','i','a','iamo','ate','ano']:kind==='ere'?['o','i','e','iamo','ete','ono']:['o','i','e','iamo','ite','ono'];
 return endings.map((end,i)=>{
  if(kind==='isc'&&[0,1,2,5].includes(i))return stem+'isc'+end;
  if(kind==='are'&&/[cg]$/.test(stem)&&end.startsWith('i'))return stem+'h'+end;
  if(kind==='are'&&stem.endsWith('i')&&end.startsWith('i'))return stem.slice(0,-1)+end;
  return stem+end;
 });
}
function futureStem(inf){if(inf.endsWith('care')||inf.endsWith('gare'))return inf.slice(0,-3)+'her';if(inf.endsWith('ciare')||inf.endsWith('giare'))return inf.slice(0,-4)+'er';return inf.endsWith('are')?inf.slice(0,-3)+'er':inf.slice(0,-1);}
export const extraVerbs=regularVerbRows.trim().split('\n').map(line=>{
 let [inf,sv,kind,part,aux,future]=line.split('|');
 if(irregularPresent[inf])kind='irregular';
 return [inf,sv,kind,irregularPresent[inf]||regularPresent(inf,kind),part,aux,future||futureStem(inf)];
}).filter(v=>!['bisognare','sembrare','dipendere','succedere','mancare'].includes(v[0])); // Mostly impersonal or context-dependent: vocabulary only below.
const irregularVerbs=[
 ['dire','säga','irregular',['dico','dici','dice','diciamo','dite','dicono'],'detto','avere','dir'],
 ['bere','dricka','irregular',['bevo','bevi','beve','beviamo','bevete','bevono'],'bevuto','avere','berr'],
 ['dare','ge','irregular',['do','dai','dà','diamo','date','danno'],'dato','avere','dar'],
 ['uscire','gå ut','irregular',['esco','esci','esce','usciamo','uscite','escono'],'uscito','essere','uscir'],
 ['rimanere','bli kvar','irregular',['rimango','rimani','rimane','rimaniamo','rimanete','rimangono'],'rimasto','essere','rimarr'],
 ['tenere','hålla;behålla','irregular',['tengo','tieni','tiene','teniamo','tenete','tengono'],'tenuto','avere','terr'],
 ['scegliere','välja','irregular',['scelgo','scegli','sceglie','scegliamo','scegliete','scelgono'],'scelto','avere','sceglier'],
 ['tradurre','översätta','irregular',['traduco','traduci','traduce','traduciamo','traducete','traducono'],'tradotto','avere','tradurr']
];
extraVerbs.push(...irregularVerbs);
for(const [it,sv] of [...extraVerbs])groups.push({it,sv:sv.split(';'),pos:'verb',topic:'actions'});
group('actions','verb',`
chiamarsi|heta
alzarsi|stiga upp (ur sängen)
svegliarsi|vakna
lavarsi|tvätta sig
vestirsi|klä på sig
sedersi|sätta sig
sentirsi|må;känna sig
trovarsi|befinna sig
ricordarsi|komma ihåg
dimenticarsi|glömma bort
fermarsi|stanna (själv)
riposarsi|vila sig
rilassarsi|slappna av
divertirsi|ha roligt
incontrarsi|träffas
sposarsi|gifta sig
trasferirsi|flytta (till en annan ort)
accorgersi|märka;upptäcka
arrabbiarsi|bli arg
preoccuparsi|oroa sig
bisognare|behövas (opersonligt)
sembrare|verka;tyckas
dipendere|bero på
succedere|hända
mancare|saknas
piacere|behaga;tycka om (mi piace)
`);
const adjectiveRows=`
alto|hög;lång (person)
basso|låg;kort (person)
corto|kort
largo|bred
stretto|smal;trång
grosso|stor;grov
giallo|gul
nero|svart
grigio|grå
azzurro|ljusblå
caldo|varm
freddo|kall
tiepido|ljummen
fresco|färsk;sval
secco|torr
umido|fuktig
bagnato|våt
pulito|ren
sporco|smutsig
ordinato|ordentlig;prydlig
disordinato|stökig
pieno|full
vuoto|tom
caro|dyr;kär
economico|billig;ekonomisk
gratuito|gratis;kostnadsfri
ricco|rik
povero|fattig
contento|glad;nöjd
felice|lycklig
triste|ledsen
stanco|trött
riposato|utvilad
malato|sjuk
sano|frisk;hälsosam
preoccupato|orolig
tranquillo|lugn
nervoso|nervös
arrabbiato|arg
occupato|upptagen
libero|ledig;fri
pronto|redo;färdig
sicuro|säker
pericoloso|farlig
facile|lätt (inte svår)
difficile|svår
semplice|enkel
complicato|komplicerad
possibile|möjlig
impossibile|omöjlig
necessario|nödvändig
utile|användbar
inutile|onödig;oanvändbar
importante|viktig
urgente|brådskande
normale|normal
strano|konstig
diverso|annorlunda;olika
uguale|likadan;lika
giusto|rätt;rättvis
sbagliato|felaktig
vero|sann;äkta
falso|falsk
buono|god;bra
cattivo|dålig;elak
ottimo|utmärkt
pessimo|usel
brutto|ful;dålig
carino|söt;trevlig
bello|vacker;fin
simpatico|trevlig;sympatisk
antipatico|otrevlig
gentile|vänlig
scortese|oartig
educato|artig;väluppfostrad
disponibile|tillgänglig;hjälpsam
puntuale|punktlig
in ritardo|försenad
veloce|snabb
lento|långsam
forte|stark
debole|svag
leggero|lätt (vikt)
pesante|tung
duro|hård
morbido|mjuk
dolce|söt (smak)
salato|salt (smak)
amaro|bitter
acido|sur (smak)
piccante|stark (kryddad)
maturo|mogen
crudo|rå (mat)
cotto|tillagad
fritto|friterad;stekt i olja
arrosto|ugnsstekt;stekt (kött)
bollito|kokt
vegetariano|vegetarisk
vegano|vegansk
locale|lokal
tipico|typisk
tradizionale|traditionell
nazionale|nationell
internazionale|internationell
straniero|utländsk
svedese|svensk
inglese|engelsk
francese|fransk
tedesco|tysk
spagnolo|spansk
giovane|ung
anziano|äldre;gammal (person)
moderno|modern
antico|gammal;antik
pubblico|offentlig
privato|privat
centrale|central
silenzioso|tyst
rumoroso|bullrig
luminoso|ljus (välbelyst)
scuro|mörk
chiaro|ljus;klar;tydlig
comodo|bekväm
scomodo|obekväm
accessibile|tillgänglig (åtkomlig)
adatto|lämplig
coperto|täckt
scoperto|otäckt;utan tak
rotto|trasig
guasto|ur funktion
elettrico|elektrisk
automatico|automatisk
manuale|manuell
digitale|digital
portatile|bärbar
potabile|drickbar
affollato|full av folk
aperto|öppen
chiuso|stängd
maggiore|större
minore|mindre
migliore|bättre (adjektiv)
peggiore|sämre (adjektiv)
prossimo|nästa
scorso|förra
ultimo|sista;senaste
primo|första
secondo|andra (ordningstal)
terzo|tredje
quarto|fjärde
quinto|femte
intero|hel
mezzo|halv
doppio|dubbel
singolo|enkel;enskild
quotidiano|daglig
settimanale|veckovis
mensile|månatlig
annuale|årlig
`;
group('descriptions','adjective',adjectiveRows);
// Agreement drills use person predicates, so adjectives such as affamato make sense.
export const extraAdjectives=adjectiveRows.trim().split('\n').map(row=>row.split('|')).filter(([it])=>!['in ritardo','arrosto','tedesco','pubblico','elettrico','automatico'].includes(it)).map(([it,sv])=>{
 if(it.endsWith('o')){const stem=it.slice(0,-1),hard=it.endsWith('go')||['ricco','secco','stanco','sporco','antico','fresco'].includes(it);return [it,stem+'a',(stem.endsWith('i')?stem:stem+(hard?'hi':'i')),stem+(/[cg]$/.test(stem)?'he':'e'),sv.split(';')[0]];}
 if(it.endsWith('e'))return [it,it,it.slice(0,-1)+'i',it.slice(0,-1)+'i',sv.split(';')[0]];
 return [it,it,it,it,sv.split(';')[0]];
});
group('connect','other',`
per favore|snälla;tack (i en begäran)
per piacere|snälla;tack (i en begäran)
mi dispiace|jag är ledsen;det var tråkigt att höra
va bene|det går bra;okej
d'accordo|överens;okej
non importa|det gör inget
non c'è problema|det är inga problem
ho bisogno|jag behöver
ho voglia|jag har lust
ho ragione|jag har rätt
hai ragione|du har rätt
ho torto|jag har fel
ho caldo|jag är varm
ho freddo|jag fryser
ho fame|jag är hungrig
ho sete|jag är törstig
ho sonno|jag är sömnig
ho paura|jag är rädd
mi piace|jag tycker om (singular)
mi piacciono|jag tycker om (plural)
non lo so|jag vet inte
non capisco|jag förstår inte
un attimo|ett ögonblick
un momento|en stund;ett ögonblick
un po'|lite grann
più|mer
meno|mindre
di più|mer (av något)
di meno|mindre (av något)
a volte|ibland
in tempo|i tid
in anticipo|i förväg;tidigt
all'improvviso|plötsligt
per caso|av en slump
per fortuna|som tur är
per esempio|till exempel
cioè|det vill säga
anzi|snarare;tvärtom
appena|nyss;så snart som
finché|så länge som;tills
dunque|alltså;således
mica|inte alls (vardagligt)
zero|noll
milione|miljon
miliardo|miljard
un paio|ett par
una dozzina|ett dussin
una volta|en gång
due volte|två gånger
spesso e volentieri|ofta och gärna
`);
group('people','noun',`
lo studente|student (man)
la studentessa|student (kvinna)
l'insegnante|lärare
il gruppo|grupp
la squadra|lag (idrott);team
il pubblico|publik
la comunità|gemenskap;lokalsamhälle
la cultura|kultur
la tradizione|tradition
l'abitudine|vana
il piacere|nöje
il desiderio|önskan
il sogno|dröm
il pensiero|tanke
l'idea|idé
il dubbio|tvivel
la ragione|anledning;rätt (i en diskussion)
il motivo|orsak;skäl
il bisogno|behov
l'aiuto|hjälp
la fiducia|förtroende
il rispetto|respekt
la pazienza|tålamod
l'attenzione|uppmärksamhet
la fortuna|tur;lycka
il caso|fall;slump
la possibilità|möjlighet
l'occasione|tillfälle
la scelta|val
il vantaggio|fördel
lo svantaggio|nackdel
`);
group('town','noun',`
l'albergo|hotell
l'hotel|hotell
il francobollo|frimärke
la cartolina|vykort
la busta|kuvert
la lettera|brev;bokstav
il giornalaio|tidningsförsäljare
il negoziante|butiksinnehavare
il cameriere|servitör
la cameriera|servitris
il cuoco|kock (man)
la cuoca|kock (kvinna)
il panettiere|bagare
il macellaio|slaktare;köttförsäljare
il pescatore|fiskare
il contadino|bonde
il giardiniere|trädgårdsmästare
la guida|guide
la fontana|fontän;vattenpost
la panchina|parkbänk
la fontanella|dricksvattenfontän
la strada statale|riksväg
la strada provinciale|provinsväg
il sentiero pedonale|gångväg
il segnale|signal;vägmärke
il cartello|skylt
la zona|område;zon
la zona pedonale|gågata;gångzon
il distributore automatico|varuautomat
la sala d'attesa|väntrum
`);
group('actions','verb',`
restituire|lämna tillbaka
convalidare|validera (biljett)
rinnovare|förnya
scadere|löpa ut;förfalla
richiedere|begära;ansöka om
fissare|fastställa;boka (tid)
trasferire|överföra;flytta (något)
spedire|skicka (försändelse)
accettare|acceptera
rifiutare|avböja;vägra
ricevere|ta emot;få
prestare|låna ut
prendere in prestito|låna (av någon)
reclamare|reklamera;klaga
inviare|skicka
informare|informera
informarsi|ta reda på
presentarsi|presentera sig
iscriversi|anmäla sig;registrera sig
prenotarsi|boka in sig
`);
export const vocabularyEntries=groups;
