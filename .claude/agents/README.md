# Team di agenti Claude Code per UnionHub

## Installazione

1. Copia tutti i file `.md` (tranne questo README) nella cartella `.claude/agents/` alla radice del repo UnionHub. Se la cartella non esiste, creala.
2. Fai commit dei file: sono condivisi via version control, così tutto il team li ha disponibili.
3. Riavvia la sessione Claude Code se `.claude/agents/` non esisteva prima (necessario solo la prima volta).

Struttura risultante:

```
UnionHub/
  .claude/
    agents/
      planner.md
      ui-designer.md
      backend-dev.md
      frontend-dev.md
      reviewer.md
      feature-scout.md
```

## Ruoli

| Ruolo | Nome agente | Modello | Cosa fa |
|---|---|---|---|
| Direttore | *(sessione principale)* | quello che scegli tu | Coordina, decide priorità, delega agli altri |
| Pianificatore | `planner` | Opus | Scompone le richieste in task concreti |
| Grafica | `ui-designer` | Sonnet | UI/UX, coerenza visiva mobile/web |
| Backend | `backend-dev` | Sonnet | NestJS, DB, RAG, logica payslip/contratti |
| Frontend | `frontend-dev` | Sonnet | Logica client mobile ed web, integrazione API |
| Revisore | `reviewer` | Opus | Code review sola lettura prima del merge |
| Esploratore | `feature-scout` | Sonnet | Propone nuove funzionalità, non scrive codice |

Il "direttore" non ha un file proprio: è semplicemente la sessione Claude Code che avvii tu. È lei a interpretare le tue richieste e a decidere quale/i sub-agente/i coinvolgere.

## Come usarlo

**Delega automatica**: Claude Code sceglie da solo il sub-agente giusto in base alla `description` di ciascun file, se la tua richiesta è abbastanza specifica. Esempio:

```
Aggiungi una nuova schermata per visualizzare lo storico dei turni di volo
```

Claude probabilmente userà `planner` per scomporre il lavoro, poi `backend-dev`/`frontend-dev`/`ui-designer` per implementare, poi `reviewer` per controllare.

**Invocazione esplicita** (consigliata finché prendi confidenza col sistema):

```
Usa il planner per scomporre questa richiesta: [descrizione feature]
```

```
Usa il backend-dev per implementare l'endpoint che il planner ha descritto al punto 2
```

```
Usa il reviewer per controllare le modifiche appena fatte prima di committare
```

**Lavoro parallelo** (più agenti contemporaneamente, es. backend e frontend su parti indipendenti dello stesso task):

```
Fai lavorare in parallelo backend-dev sull'endpoint /api/shifts e frontend-dev sulla schermata che lo consuma, usando l'interfaccia TypeScript che definisci tu come contratto condiviso
```

## Consigli pratici

- **Comincia con 1-2 agenti per volta** finché non hai familiarità con come si comportano su questo codebase, poi aumenta il parallelismo.
- **Usa sempre il reviewer prima di mergiare** modifiche non banali, specialmente su logica di calcolo (Fondo Volo, CLA, payslip) dove un errore numerico ha conseguenze concrete per un pilota.
- **Il planner non scrive codice**: se lo vedi provarci, è un segnale che la sua descrizione o i suoi permessi vanno rivisti.
- Puoi affinare questi file nel tempo: se un agente ripete un errore, aggiungi una riga esplicita al suo prompt per correggerlo — è testo, non codice compilato.
