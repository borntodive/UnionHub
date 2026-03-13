export declare class PdfImageService {
    private readonly logger;
    private readonly tempDir;
    constructor();
    private ensureTempDirExists;
    convertFirstPageToImage(pdfBuffer: Buffer): Promise<string>;
    convertFirstPageToFile(pdfBuffer: Buffer, filename: string): Promise<string>;
}
