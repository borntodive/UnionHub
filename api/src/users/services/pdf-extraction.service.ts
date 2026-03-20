import { Injectable } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";
import { Ruolo } from "../../common/enums/ruolo.enum";

export interface ExtractedPdfData {
  crewcode?: string;
  nome?: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  baseId?: string;
  contrattoId?: string;
  gradeId?: string;
  dataIscrizione?: string; // Data firma dal PDF
  confidence: number;
  extractionMethod: "form_fields" | "ocr" | "manual";
  rawFields: Record<string, string>;
}

// Field mappings per ruolo
const FIELD_MAPPINGS: Record<Ruolo, Record<string, string[]>> = {
  [Ruolo.PILOT]: {
    crewcode: [
      "crewcode",
      "crew_code",
      "codice",
      "id",
      "matricola",
      "CREWCODE",
    ],
    nome: ["nome", "name", "first_name", "firstname", "nome_pilota", "Nome"],
    cognome: [
      "cognome",
      "surname",
      "last_name",
      "lastname",
      "cognome_pilota",
      "Cognome",
    ],
    email: ["email", "e-mail", "mail", "email_address", "Email"],
    telefono: ["telefono", "phone", "cellulare", "mobile", "tel", "Cellulare"],
    base: ["base", "base_operativa", "aeroporto", "airport", "Base"],
    contratto: [
      "contratto",
      "contract",
      "tipo_contratto",
      "contract_type",
      "Tipo Lavoro",
    ],
    grade: ["grade", "grado", "qualifica", "rank", "Qualifica"],
    dataIscrizione: [
      "data_iscrizione",
      "data_firma",
      "data",
      "date",
      "firma_data",
      "signature_date",
      "Data Firma",
      "Data",
      "Date",
      "data firma",
      "firma data",
      "DATA",
      "DataFirma",
      "dataFirma",
      "Data#0",
      "data#0",
      "DATA#0",
    ],
  },
  [Ruolo.CABIN_CREW]: {
    crewcode: [
      "crewcode",
      "crew_code",
      "codice",
      "id",
      "matricola",
      "CREWCODE",
    ],
    nome: ["nome", "name", "first_name", "firstname", "nome_hostess", "Nome"],
    cognome: [
      "cognome",
      "surname",
      "last_name",
      "lastname",
      "cognome_hostess",
      "Cognome",
    ],
    email: ["email", "e-mail", "mail", "email_address", "Email"],
    telefono: ["telefono", "phone", "cellulare", "mobile", "tel", "Cellulare"],
    base: ["base", "base_operativa", "aeroporto", "airport", "Base"],
    contratto: [
      "contratto",
      "contract",
      "tipo_contratto",
      "contract_type",
      "Tipo Lavoro",
    ],
    grade: ["grade", "grado", "qualifica", "rank", "Qualifica"],
    dataIscrizione: [
      "data_iscrizione",
      "data_firma",
      "data",
      "date",
      "firma_data",
      "signature_date",
      "Data Firma",
      "Data",
      "Date",
      "data firma",
      "firma data",
      "DATA",
      "DataFirma",
      "dataFirma",
    ],
  },
};

@Injectable()
export class PdfExtractionService {
  async extractFromPdf(
    pdfBuffer: Buffer,
    role: Ruolo,
  ): Promise<ExtractedPdfData> {
    try {
      // === TRY 1: Form Fields ===
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      const rawFields: Record<string, string> = {};
      const extracted: Partial<ExtractedPdfData> = {
        extractionMethod: "form_fields",
        confidence: 0,
      };

      // Extract all form fields
      for (const field of fields) {
        const name = field.getName(); // Keep original case for matching
        const nameLower = name.toLowerCase().trim();
        let value = "";

        try {
          // Get value based on field type
          const fieldType = field.constructor.name;

          if (fieldType.includes("TextField")) {
            const textField = form.getTextField(field.getName());
            value = textField.getText() || "";
          } else if (fieldType.includes("Dropdown")) {
            const dropdown = form.getDropdown(field.getName());
            const selected = dropdown.getSelected();
            value = Array.isArray(selected)
              ? selected[0] || ""
              : selected || "";
          } else if (fieldType.includes("RadioGroup")) {
            const radio = form.getRadioGroup(field.getName());
            value = radio.getSelected() || "";
          } else if (fieldType.includes("CheckBox")) {
            const checkbox = form.getCheckBox(field.getName());
            value = checkbox.isChecked() ? "true" : "false";
          } else {
            // Try to get value generically
            const textField = form.getTextField(field.getName());
            value = textField?.getText() || "";
          }
        } catch (e) {
          // If specific method fails, try generic
          try {
            value = (field as any).getText?.() || "";
          } catch {
            value = "";
          }
        }

        if (value && value.trim()) {
          rawFields[name] = value.trim(); // Store with original name
          rawFields[nameLower] = value.trim(); // Also store lowercase
        }
      }

      // Map fields to our data structure
      const mapping = FIELD_MAPPINGS[role] || FIELD_MAPPINGS[Ruolo.PILOT];
      let matchedFields = 0;
      let totalFields = 0;

      // Use Record for flexible field mapping
      const mappedFields: Record<string, string> = {};

      for (const [targetField, possibleNames] of Object.entries(mapping)) {
        totalFields++;
        for (const possibleName of possibleNames) {
          // Try exact match first
          if (rawFields[possibleName]) {
            mappedFields[targetField] = rawFields[possibleName];
            matchedFields++;
            break;
          }

          // Try partial match
          const partialMatch = Object.keys(rawFields).find(
            (key) => key.includes(possibleName) || possibleName.includes(key),
          );
          if (partialMatch) {
            mappedFields[targetField] = rawFields[partialMatch];
            matchedFields++;
            break;
          }
        }
      }

      // Calculate confidence based on matched fields
      const formConfidence = totalFields > 0 ? matchedFields / totalFields : 0;

      // If no date found in form fields, try to extract from text content
      let dataIscrizione: string | undefined = mappedFields["dataIscrizione"];
      if (!dataIscrizione) {
        dataIscrizione = this.extractDateFromText(rawFields);
      } else {
        // Normalize date format to DD/MM/YYYY
        dataIscrizione = this.normalizeDateFormat(dataIscrizione);
      }

      return {
        crewcode: mappedFields["crewcode"],
        nome: mappedFields["nome"],
        cognome: mappedFields["cognome"],
        email: mappedFields["email"],
        telefono: mappedFields["telefono"],
        baseId: mappedFields["base"],
        contrattoId: mappedFields["contratto"],
        gradeId: mappedFields["grade"],
        dataIscrizione,
        confidence: formConfidence,
        extractionMethod: formConfidence > 0 ? "form_fields" : "manual",
        rawFields,
      };
    } catch (error) {
      console.error("PDF extraction error:", error);
      return {
        confidence: 0,
        extractionMethod: "manual",
        rawFields: {},
      };
    }
  }

  /**
   * Normalize date string to DD/MM/YYYY format
   */
  private normalizeDateFormat(dateStr: string): string {
    // Remove extra spaces
    dateStr = dateStr.trim();

    // Detect separator
    const separator = dateStr.includes("/")
      ? "/"
      : dateStr.includes("-")
        ? "-"
        : dateStr.includes(".")
          ? "."
          : dateStr.includes(" ")
            ? " "
            : "/";

    const parts = dateStr
      .split(separator)
      .map((p) => p.trim())
      .filter((p) => p);

    if (parts.length !== 3) {
      return dateStr; // Can't parse, return as-is
    }

    // Check if it's YYYY/MM/DD format (first part is 4 digits)
    if (parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      return `${day}/${month}/${year}`;
    }

    // Assume DD/MM/YYYY format
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${day}/${month}/${year}`;
  }

  /**
   * Try to extract a date from raw field values
   * Looks for common date patterns in field values and converts to DD/MM/YYYY format
   */
  private extractDateFromText(
    rawFields: Record<string, string>,
  ): string | undefined {
    // Common date patterns with various separators (/, -, ., space)
    const datePatterns = [
      // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or DD MM YYYY
      /\b(\d{1,2})\s*[\/\-\.\s]\s*(\d{1,2})\s*[\/\-\.\s]\s*(\d{4})\b/,
      // YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
      /\b(\d{4})\s*[\/\-\.\s]\s*(\d{1,2})\s*[\/\-\.\s]\s*(\d{1,2})\b/,
    ];

    // Search in all field values for date patterns
    for (const [key, value] of Object.entries(rawFields)) {
      // Skip fields that are likely not dates
      if (
        key.toLowerCase().includes("crewcode") ||
        key.toLowerCase().includes("email") ||
        key.toLowerCase().includes("telefono") ||
        key.toLowerCase().includes("phone")
      ) {
        continue;
      }

      for (const pattern of datePatterns) {
        const match = value.match(pattern);
        if (match) {
          const separator = match[0].includes("/")
            ? "/"
            : match[0].includes("-")
              ? "-"
              : match[0].includes(".")
                ? "."
                : "/";

          // Check if it's DD/MM/YYYY format (first group is 1-2 digits, last is 4 digits)
          if (match[1].length <= 2 && match[3].length === 4) {
            // DD/MM/YYYY format - keep as is but ensure 2 digits for day and month
            const day = match[1].padStart(2, "0");
            const month = match[2].padStart(2, "0");
            const year = match[3];
            return `${day}${separator}${month}${separator}${year}`;
          } else if (match[1].length === 4 && match[3].length <= 2) {
            // YYYY/MM/DD format - convert to DD/MM/YYYY
            const year = match[1];
            const month = match[2].padStart(2, "0");
            const day = match[3].padStart(2, "0");
            return `${day}${separator}${month}${separator}${year}`;
          }

          // Default: return as DD/MM/YYYY
          return match[0];
        }
      }
    }

    return undefined;
  }

  /**
   * Try to match extracted text values to database entities
   * This is a helper that can be called after initial extraction
   */
  matchToEntities(
    extracted: ExtractedPdfData,
    bases: { id: string; codice: string; nome: string }[],
    contracts: { id: string; codice: string; nome: string }[],
    grades: { id: string; codice: string; nome: string }[],
  ): ExtractedPdfData {
    const result = { ...extracted };

    // Match base
    const baseId = extracted.baseId;
    if (baseId && baseId !== "true" && baseId !== "false") {
      const baseMatch = bases.find(
        (b) =>
          b.codice.toLowerCase() === baseId.toLowerCase() ||
          b.nome.toLowerCase().includes(baseId.toLowerCase()) ||
          baseId.toLowerCase().includes(b.codice.toLowerCase()),
      );
      if (baseMatch) {
        result.baseId = baseMatch.id;
      }
    }

    // Match contract - skip if it's a boolean string (checkbox)
    const contrattoId = extracted.contrattoId;
    if (contrattoId && contrattoId !== "true" && contrattoId !== "false") {
      const contractMatch = contracts.find(
        (c) =>
          c.codice.toLowerCase() === contrattoId.toLowerCase() ||
          c.nome.toLowerCase().includes(contrattoId.toLowerCase()) ||
          contrattoId.toLowerCase().includes(c.codice.toLowerCase()),
      );
      if (contractMatch) {
        result.contrattoId = contractMatch.id;
      }
    }

    // Match grade
    const gradeId = extracted.gradeId;
    if (gradeId) {
      const gradeMatch = grades.find(
        (g) =>
          g.codice.toLowerCase() === gradeId.toLowerCase() ||
          g.nome.toLowerCase().includes(gradeId.toLowerCase()) ||
          gradeId.toLowerCase().includes(g.codice.toLowerCase()),
      );
      if (gradeMatch) {
        result.gradeId = gradeMatch.id;
      }
    }

    return result;
  }
}
