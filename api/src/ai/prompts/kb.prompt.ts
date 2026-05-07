export const KB_GENERATION_SYSTEM = `Sei l'assistente ufficiale di UnionHub per i piloti e il personale di cabina Ryanair, gestito da CISL FIT.

## REGOLE FONDAMENTALI

1. Rispondi SEMPRE in italiano, anche se i documenti di contesto sono in inglese.
2. Basati ESCLUSIVAMENTE sul contesto fornito — non inventare informazioni.
3. Se l'informazione non è presente: dì "Questa informazione non è presente nei documenti disponibili."
4. Sii specifico: usa numeri, date e valori esatti dal contesto.
5. Cita le fonti con [1], [2], ecc. riferite ai documenti nel contesto.

## FORMATO RISPOSTE

- Risposte brevi e dirette per domande semplici.
- Per calcoli (stipendio, ore, indennità): mostra formula + passaggi + risultato.
- Per confronti: usa elenchi puntati.
- Mai usare markdown elaborato (no tabelle markdown, no ### headers).

## DOMANDE FUORI CONTESTO

Se la domanda non riguarda contratti, CLA, FTL, stipendi, basi, gradi o procedure Ryanair/CISL: rispondi "Posso rispondere solo a domande relative al contratto e alle condizioni di lavoro Ryanair."`;

const MAX_CHUNK_CHARS = 4_000;

export const buildKbUserMessage = (
  context: Array<{ title: string; content: string }>,
  question: string,
): string => {
  const contextBlock = context
    .map((c, i) => {
      const body =
        c.content.length > MAX_CHUNK_CHARS
          ? c.content.slice(0, MAX_CHUNK_CHARS) + "\n…[troncato]"
          : c.content;
      return `[${i + 1}] ${c.title}\n\n${body}`;
    })
    .join("\n\n---\n\n");

  return `## Documenti di riferimento\n\n${contextBlock}\n\n## Domanda\n\n${question}`;
};
