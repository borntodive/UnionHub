"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrExtractionService = void 0;
const common_1 = require("@nestjs/common");
const Tesseract = __importStar(require("tesseract.js"));
const pdf2pic_1 = require("pdf2pic");
const OCR_PATTERNS = {
    crewcode: [
        /crew\s*code[\s:]*([A-Z0-9]{3,10})/i,
        /crewcode[\s:]*([A-Z0-9]{3,10})/i,
        /codice[\s:]*([A-Z0-9]{3,10})/i,
        /matricola[\s:]*([A-Z0-9]{3,10})/i,
    ],
    nome: [
        /nome[\s:]*([A-Za-zÀ-ÿ\s]{2,30})/i,
        /name[\s:]*([A-Za-zÀ-ÿ\s]{2,30})/i,
        /first\s*name[\s:]*([A-Za-zÀ-ÿ\s]{2,30})/i,
    ],
    cognome: [
        /cognome[\s:]*([A-Za-zÀ-ÿ\s']{2,30})/i,
        /surname[\s:]*([A-Za-zÀ-ÿ\s']{2,30})/i,
        /last\s*name[\s:]*([A-Za-zÀ-ÿ\s']{2,30})/i,
    ],
    email: [
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
        /e-?mail[\s:]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    ],
    telefono: [
        /cellulare[\s:]*([+\d\s]{10,15})/i,
        /telefono[\s:]*([+\d\s]{10,15})/i,
        /phone[\s:]*([+\d\s]{10,15})/i,
        /mobile[\s:]*([+\d\s]{10,15})/i,
        /(\+39\s?\d{3}\s?\d{3}\s?\d{4})/,
    ],
    base: [
        /base[\s:]*([A-Z]{3})/i,
        /base\s*operativa[\s:]*([A-Z]{3})/i,
        /aeroporto[\s:]*([A-Z]{3})/i,
    ],
    qualifica: [
        /qualifica[\s:]*([A-Z]{2,10})/i,
        /grade[\s:]*([A-Z]{2,10})/i,
        /grado[\s:]*([A-Z]{2,10})/i,
        /rank[\s:]*([A-Z]{2,10})/i,
    ],
};
let OcrExtractionService = class OcrExtractionService {
    async extractFromPdf(pdfBuffer) {
        try {
            console.log('OCR: Converting PDF to images...');
            const options = {
                density: 150,
                format: 'png',
                width: 1200,
                height: 1600,
                preserveAspectRatio: true,
            };
            const convert = (0, pdf2pic_1.fromBuffer)(pdfBuffer, options);
            const imageResponse = await convert(1, { responseType: 'base64' });
            console.log('OCR: pdf2pic response type:', typeof imageResponse);
            console.log('OCR: pdf2pic response keys:', imageResponse ? Object.keys(imageResponse) : 'null');
            let base64Image = null;
            if (typeof imageResponse === 'string') {
                base64Image = imageResponse;
            }
            else if (Array.isArray(imageResponse) && imageResponse.length > 0) {
                const first = imageResponse[0];
                base64Image = typeof first === 'string' ? first : first?.base64 || null;
            }
            else if (imageResponse && typeof imageResponse === 'object') {
                base64Image = imageResponse.base64 || imageResponse.content || null;
            }
            if (!base64Image) {
                console.log('OCR: No base64 data in image response');
                return {
                    confidence: 0,
                    rawText: '',
                };
            }
            console.log('OCR: Image converted, base64 length:', base64Image.length);
            console.log('OCR: Running Tesseract...');
            const result = await Tesseract.recognize(`data:image/png;base64,${base64Image}`, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
            });
            console.log('OCR: Text extracted, length:', result.data.text.length);
            return this.parseExtractedText(result.data.text);
        }
        catch (error) {
            console.error('OCR extraction error:', error);
            return {
                confidence: 0,
                rawText: '',
            };
        }
    }
    parseExtractedText(text) {
        const extracted = {
            rawText: text,
            confidence: 0,
        };
        let matchedFields = 0;
        const totalFields = Object.keys(OCR_PATTERNS).length;
        for (const [field, patterns] of Object.entries(OCR_PATTERNS)) {
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    const value = match[1].trim();
                    if (value) {
                        extracted[field] = value;
                        matchedFields++;
                        break;
                    }
                }
            }
        }
        extracted.confidence = totalFields > 0 ? matchedFields / totalFields : 0;
        console.log('OCR extracted fields:', {
            matchedFields,
            totalFields,
            confidence: extracted.confidence,
            data: {
                crewcode: extracted.crewcode,
                nome: extracted.nome,
                cognome: extracted.cognome,
                email: extracted.email,
                telefono: extracted.telefono,
                base: extracted.base,
                qualifica: extracted.qualifica,
            },
        });
        return extracted;
    }
    getManualFallback() {
        return {
            confidence: 0,
            rawText: '',
        };
    }
};
exports.OcrExtractionService = OcrExtractionService;
exports.OcrExtractionService = OcrExtractionService = __decorate([
    (0, common_1.Injectable)()
], OcrExtractionService);
//# sourceMappingURL=ocr-extraction.service.js.map