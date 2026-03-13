export declare class FileStorageService {
    private readonly logger;
    private readonly uploadDir;
    constructor();
    private ensureUploadDirExists;
    savePdf(buffer: Buffer, originalName: string, crewcode: string): Promise<{
        filePath: string;
        fileUrl: string;
    }>;
    getFilePathFromUrl(fileUrl: string): string;
    deleteFile(fileUrl: string): Promise<void>;
    fileExists(fileUrl: string): boolean;
}
