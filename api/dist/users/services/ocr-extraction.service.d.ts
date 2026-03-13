export interface OcrExtractedData {
    crewcode?: string;
    nome?: string;
    cognome?: string;
    email?: string;
    telefono?: string;
    base?: string;
    qualifica?: string;
    confidence: number;
    rawText: string;
}
export declare class OcrExtractionService {
    extractFromPdf(pdfBuffer: Buffer): Promise<OcrExtractedData>;
    private parseExtractedText;
    getManualFallback(): OcrExtractedData;
}
