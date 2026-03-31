# UnionConnect — Guida Amministratori

Questa guida descrive le funzionalità riservate agli **Admin** e al **SuperAdmin**.

---

## Ruoli amministrativi

| Ruolo                | Descrizione                                                     |
| -------------------- | --------------------------------------------------------------- |
| **Admin Piloti**     | Gestisce esclusivamente i membri con ruolo `pilot`              |
| **Admin Cabin Crew** | Gestisce esclusivamente i membri con ruolo `cabin_crew`         |
| **SuperAdmin**       | Accesso completo a tutto, nessun filtro per ruolo professionale |

> Gli Admin vedono solo i membri del proprio ruolo professionale in ogni schermata. Il SuperAdmin non ha questa restrizione.

---

## Dashboard

La dashboard mostra in tempo reale:

- Numero totale di membri attivi (scoped per ruolo se Admin)
- Membri recentemente aggiunti
- Segnalazioni aperte in attesa di risposta
- Indicatore di iscrizioni pendenti in approvazione

---

## Gestione Membri

### Lista membri

- Visualizza tutti i membri attivi del tuo ruolo (Admin) o di tutti i ruoli (SuperAdmin).
- Filtri disponibili: base, contratto, grado, stato iscrizione, ricerca testuale.
- Esportazione CSV dell'intera lista o di un sottoinsieme filtrato.

### Scheda membro

- Visualizza tutti i dati anagrafici e professionali del membro.
- Accede al modulo di adesione PDF caricato.
- Visualizza lo storico delle segnalazioni inviate dal membro.

### Crea membro

- Inserisci manualmente un nuovo membro compilando il form (crewcode, nome, cognome, email, grado, base, contratto, ecc.).
- Il membro riceve automaticamente una email di benvenuto con le credenziali di accesso.
- La password iniziale è `password` con cambio obbligatorio al primo accesso.

### Modifica membro

- Aggiorna qualsiasi dato del membro: dati anagrafici, base, contratto, grado, flag sindacali (RSA, RLS, ITUD, Collaboratore Sindacale).
- Attiva o disattiva l'account.

### Carica modulo di adesione

- Per ogni membro puoi caricare il **PDF del modulo di adesione** firmato.
- Il file viene inviato automaticamente alla segreteria via email.
- Il modulo è visualizzabile in anteprima direttamente dall'app.

### Disattivazione membro

- Disattivare un membro lo esclude dall'app senza eliminarlo dal database.
- I dati rimangono accessibili per consultazione storica.

### Importazione massiva (Bulk Import)

- Importa fino a migliaia di membri da un file **CSV o Excel (.xlsx / .xls)**.
- Il sistema abbina automaticamente basi e gradi tramite codice (es. `FCO`, `CPT`).
- Vengono riportati righe create con successo e righe con errore (con indicazione del motivo).

---

## Iscrizioni Pendenti

Quando un utente si registra autonomamente tramite **Unisciti a noi**, la sua richiesta arriva in questa sezione.

- Visualizza le iscrizioni in attesa di approvazione.
- Per ogni richiesta puoi:
  - **Approvare**: l'utente viene attivato e riceve la email di benvenuto con le credenziali.
  - **Rifiutare**: l'utente viene notificato del rifiuto.
- Il badge nella sidebar mostra il numero di richieste pendenti in tempo reale.

---

## Segnalazioni (Issues)

### Lista segnalazioni

- Visualizza tutte le segnalazioni inviate dai membri del tuo ruolo.
- Filtra per categoria, urgenza, stato o membro.
- Ordina per data o priorità.

### Dettaglio segnalazione

- Leggi il testo completo della segnalazione.
- Aggiungi note di risposta interne.
- Cambia lo **stato**: Aperta → In lavorazione → Risolta → Chiusa.
- Riapri una segnalazione chiusa se necessario (solo Admin/SuperAdmin).

### Generazione riepilogo AI

- Con un click genera un **riepilogo automatico** dell'insieme delle segnalazioni aperte tramite AI.
- Utile per report periodici o per avere una visione d'insieme rapida.

### Esporta CSV

- Esporta tutte le segnalazioni visibili in un file CSV per elaborazioni esterne.

---

## Documenti

### Lista documenti

- Visualizza tutti i comunicati e documenti, indipendentemente dallo stato.

### Crea documento

- Compila titolo, corpo del comunicato (testo ricco con editor HTML) e destinatari (piloti, cabin crew o tutti).
- Il documento parte in stato **Bozza**.

### Workflow di pubblicazione

I documenti seguono un workflow a stati:

```
Bozza → In revisione → Approvato → Verificato → Pubblicato
```

- **In revisione**: il documento è stato sottoposto a revisione.
- **Approvato**: approvazione formale.
- **Verificato**: verifica finale prima della pubblicazione.
- **Pubblicato**: visibile a tutti i membri destinatari.

### Strumenti AI

Dall'editor del documento sono disponibili:

- **Riscrivi con AI**: ottimizza il testo per una comunicazione sindacale formale, preservando la formattazione HTML.
- **Traduci in inglese**: genera la versione inglese del comunicato (sezione separata nello stesso documento).

### Generazione PDF

- Genera il PDF ufficiale del comunicato con intestazione FIT-CISL (carta intestata verde, font Times New Roman/Tinos).
- Per documenti congiunti (es. FIT-CISL + ANPAC): usa il template con doppio logo, font Avenir, formato data `Roma dd.MM.yy`.
- Il PDF è visualizzabile nell'app e scaricabile/condivisibile.

---

## Contratto Collettivo (CLA)

### Gestione CLA

- Crea e aggiorna i capitoli del Contratto Collettivo.
- Ogni capitolo supporta testo in italiano e in inglese.
- Le versioni precedenti vengono archiviate nello storico.

### Versioning

- Ogni modifica crea una nuova versione con data di efficacia (anno e mese).
- I membri vedono sempre la versione più recente pubblicata.

---

## Statistiche

### Vista Admin

- Totale membri attivi per grado (top 3 con opzione "Vedi tutti").
- Distribuzione per base operativa.
- Distribuzione per contratto.

### Vista SuperAdmin (3 tab)

| Tab            | Contenuto                                |
| -------------- | ---------------------------------------- |
| **Generale**   | Statistiche aggregate di tutti i membri  |
| **Piloti**     | Statistiche dei soli piloti              |
| **Cabin Crew** | Statistiche del solo personale di cabina |

---

## Configurazione (solo SuperAdmin)

### Basi

- Crea, modifica ed elimina le basi operative (es. FCO, MXP, BGY).

### Contratti

- Crea, modifica ed elimina i tipi di contratto (es. MAY-PI, MAY-CC).

### Gradi

- Crea, modifica ed elimina i gradi professionali.
- Ogni grado è associato a un ruolo (`pilot` o `cabin_crew`).
- Esempi piloti: Commander, First Officer, Second Officer, TRI, TRE.
- Esempi cabin crew: Cabin Manager, Senior Cabin Crew, Flight Attendant.

### Categorie segnalazioni

- Gestisce le categorie disponibili nel form di segnalazione.
- Ogni categoria può essere limitata a piloti, cabin crew o tutti.
- Le modifiche propagano una notifica silenziosa a tutti i dispositivi per aggiornare la cache offline.

### Urgenze segnalazioni

- Gestisce i livelli di urgenza: Critica, Alta, Media, Bassa.
- Analogamente alle categorie, le modifiche aggiornano la cache offline di tutti i dispositivi.

---

## Membri Disattivati (solo SuperAdmin)

- Lista di tutti i membri disattivati nel tempo.
- **Riattiva**: ripristina l'accesso di un membro precedentemente disattivato.
- **Elimina definitivamente**: cancella il membro in modo irreversibile dal database.

---

## Calcolatore Busta Paga — funzioni admin

### Override valori contrattuali

- Nella scheda **Override** del calcolatore puoi sovrascrivere direttamente i valori contrattuali per un membro specifico.
- I valori di override sono applicati runtime e non persistono nel database.
- Utile per verificare calcoli con accordi individuali o sperimentazioni.

### Tab Debug (solo SuperAdmin)

- Visualizza tutti i valori intermedi del calcolo (imponibili, coefficienti, deduzioni step-by-step).
- Utile per verificare la correttezza del calcolo con il consulente del lavoro.

---

## Email di test (solo SuperAdmin)

Nel menu di debug sono disponibili due endpoint per verificare il funzionamento del sistema email:

- **Test email di benvenuto**: invia una email di benvenuto di prova con dati fittizi.
- **Test email modulo di adesione**: invia alla segreteria una email di prova con allegato PDF.

---

## Notifiche push admin

Gli admin ricevono notifiche push per:

- Nuova iscrizione autonoma in attesa di approvazione
- Comunicazioni dal SuperAdmin
