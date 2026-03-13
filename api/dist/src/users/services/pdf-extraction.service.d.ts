import { Ruolo } from '../../common/enums/ruolo.enum';
export interface ExtractedPdfData {
    crewcode?: string;
    nome?: string;
    cognome?: string;
    email?: string;
    telefono?: string;
    baseId?: string;
    contrattoId?: string;
    gradeId?: string;
    confidence: number;
    extractionMethod: 'form_fields' | 'ocr' | 'manual';
    rawFields: Record<string, string>;
}
export declare class PdfExtractionService {
    extractFromPdf(pdfBuffer: Buffer, role: Ruolo): Promise<ExtractedPdfData>;
    matchToEntities(extracted: ExtractedPdfData, bases: {
        id: string;
        codice: string;
        nome: string;
    }[], contracts: {
        id: string;
        codice: string;
        nome: string;
    }[], grades: {
        id: string;
        codice: string;
        nome: string;
    }[]): ExtractedPdfData;
}
