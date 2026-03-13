"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfExtractionService = void 0;
const common_1 = require("@nestjs/common");
const pdf_lib_1 = require("pdf-lib");
const ruolo_enum_1 = require("../../common/enums/ruolo.enum");
const FIELD_MAPPINGS = {
    [ruolo_enum_1.Ruolo.PILOT]: {
        crewcode: ['crewcode', 'crew_code', 'codice', 'id', 'matricola', 'CREWCODE'],
        nome: ['nome', 'name', 'first_name', 'firstname', 'nome_pilota', 'Nome'],
        cognome: ['cognome', 'surname', 'last_name', 'lastname', 'cognome_pilota', 'Cognome'],
        email: ['email', 'e-mail', 'mail', 'email_address', 'Email'],
        telefono: ['telefono', 'phone', 'cellulare', 'mobile', 'tel', 'Cellulare'],
        base: ['base', 'base_operativa', 'aeroporto', 'airport', 'Base'],
        contratto: ['contratto', 'contract', 'tipo_contratto', 'contract_type', 'Tipo Lavoro'],
        grade: ['grade', 'grado', 'qualifica', 'rank', 'Qualifica'],
        dataIscrizione: ['data_iscrizione', 'data_firma', 'data', 'date', 'firma_data', 'signature_date', 'Data Firma', 'Data', 'Date', 'data firma', 'firma data', 'DATA', 'DataFirma', 'dataFirma', 'Data#0', 'data#0', 'DATA#0'],
    },
    [ruolo_enum_1.Ruolo.CABIN_CREW]: {
        crewcode: ['crewcode', 'crew_code', 'codice', 'id', 'matricola', 'CREWCODE'],
        nome: ['nome', 'name', 'first_name', 'firstname', 'nome_hostess', 'Nome'],
        cognome: ['cognome', 'surname', 'last_name', 'lastname', 'cognome_hostess', 'Cognome'],
        email: ['email', 'e-mail', 'mail', 'email_address', 'Email'],
        telefono: ['telefono', 'phone', 'cellulare', 'mobile', 'tel', 'Cellulare'],
        base: ['base', 'base_operativa', 'aeroporto', 'airport', 'Base'],
        contratto: ['contratto', 'contract', 'tipo_contratto', 'contract_type', 'Tipo Lavoro'],
        grade: ['grade', 'grado', 'qualifica', 'rank', 'Qualifica'],
        dataIscrizione: ['data_iscrizione', 'data_firma', 'data', 'date', 'firma_data', 'signature_date', 'Data Firma', 'Data', 'Date', 'data firma', 'firma data', 'DATA', 'DataFirma', 'dataFirma'],
    },
};
let PdfExtractionService = class PdfExtractionService {
    async extractFromPdf(pdfBuffer, role) {
        try {
            const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer);
            const form = pdfDoc.getForm();
            const fields = form.getFields();
            console.log('PDF Extraction: Found', fields.length, 'form fields');
            const rawFields = {};
            const extracted = {
                extractionMethod: 'form_fields',
                confidence: 0,
            };
            console.log('=== PDF EXTRACTION DEBUG ===');
            console.log('Total fields found:', fields.length);
            for (const field of fields) {
                const name = field.getName();
                const nameLower = name.toLowerCase().trim();
                let value = '';
                try {
                    const fieldType = field.constructor.name;
                    if (fieldType.includes('TextField')) {
                        const textField = form.getTextField(field.getName());
                        value = textField.getText() || '';
                    }
                    else if (fieldType.includes('Dropdown')) {
                        const dropdown = form.getDropdown(field.getName());
                        const selected = dropdown.getSelected();
                        value = Array.isArray(selected) ? selected[0] || '' : selected || '';
                    }
                    else if (fieldType.includes('RadioGroup')) {
                        const radio = form.getRadioGroup(field.getName());
                        value = radio.getSelected() || '';
                    }
                    else if (fieldType.includes('CheckBox')) {
                        const checkbox = form.getCheckBox(field.getName());
                        value = checkbox.isChecked() ? 'true' : 'false';
                    }
                    else {
                        const textField = form.getTextField(field.getName());
                        value = textField?.getText() || '';
                    }
                }
                catch (e) {
                    try {
                        value = field.getText?.() || '';
                    }
                    catch {
                        value = '';
                    }
                }
                if (value && value.trim()) {
                    rawFields[name] = value.trim();
                    rawFields[nameLower] = value.trim();
                    console.log(`Field: "${name}" = "${value.trim()}"`);
                }
            }
            console.log('Raw fields extracted:', Object.keys(rawFields));
            const mapping = FIELD_MAPPINGS[role] || FIELD_MAPPINGS[ruolo_enum_1.Ruolo.PILOT];
            let matchedFields = 0;
            let totalFields = 0;
            const mappedFields = {};
            for (const [targetField, possibleNames] of Object.entries(mapping)) {
                totalFields++;
                for (const possibleName of possibleNames) {
                    if (rawFields[possibleName]) {
                        mappedFields[targetField] = rawFields[possibleName];
                        matchedFields++;
                        break;
                    }
                    const partialMatch = Object.keys(rawFields).find(key => key.includes(possibleName) || possibleName.includes(key));
                    if (partialMatch) {
                        mappedFields[targetField] = rawFields[partialMatch];
                        matchedFields++;
                        break;
                    }
                }
            }
            const formConfidence = totalFields > 0 ? matchedFields / totalFields : 0;
            let dataIscrizione = mappedFields['dataIscrizione'];
            if (!dataIscrizione) {
                dataIscrizione = this.extractDateFromText(rawFields);
            }
            else {
                dataIscrizione = this.normalizeDateFormat(dataIscrizione);
            }
            console.log('Form fields confidence:', formConfidence);
            console.log('Using FORM FIELDS extraction');
            return {
                crewcode: mappedFields['crewcode'],
                nome: mappedFields['nome'],
                cognome: mappedFields['cognome'],
                email: mappedFields['email'],
                telefono: mappedFields['telefono'],
                baseId: mappedFields['base'],
                contrattoId: mappedFields['contratto'],
                gradeId: mappedFields['grade'],
                dataIscrizione,
                confidence: formConfidence,
                extractionMethod: formConfidence > 0 ? 'form_fields' : 'manual',
                rawFields,
            };
        }
        catch (error) {
            console.error('PDF extraction error:', error);
            return {
                confidence: 0,
                extractionMethod: 'manual',
                rawFields: {},
            };
        }
    }
    normalizeDateFormat(dateStr) {
        dateStr = dateStr.trim();
        const separator = dateStr.includes('/') ? '/' :
            dateStr.includes('-') ? '-' :
                dateStr.includes('.') ? '.' :
                    dateStr.includes(' ') ? ' ' : '/';
        const parts = dateStr.split(separator).map(p => p.trim()).filter(p => p);
        if (parts.length !== 3) {
            return dateStr;
        }
        if (parts[0].length === 4) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            return `${day}/${month}/${year}`;
        }
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${day}/${month}/${year}`;
    }
    extractDateFromText(rawFields) {
        const datePatterns = [
            /\b(\d{1,2})\s*[\/\-\.\s]\s*(\d{1,2})\s*[\/\-\.\s]\s*(\d{4})\b/,
            /\b(\d{4})\s*[\/\-\.\s]\s*(\d{1,2})\s*[\/\-\.\s]\s*(\d{1,2})\b/,
        ];
        for (const [key, value] of Object.entries(rawFields)) {
            if (key.toLowerCase().includes('crewcode') ||
                key.toLowerCase().includes('email') ||
                key.toLowerCase().includes('telefono') ||
                key.toLowerCase().includes('phone')) {
                continue;
            }
            for (const pattern of datePatterns) {
                const match = value.match(pattern);
                if (match) {
                    const separator = match[0].includes('/') ? '/' :
                        match[0].includes('-') ? '-' :
                            match[0].includes('.') ? '.' : '/';
                    if (match[1].length <= 2 && match[3].length === 4) {
                        const day = match[1].padStart(2, '0');
                        const month = match[2].padStart(2, '0');
                        const year = match[3];
                        return `${day}${separator}${month}${separator}${year}`;
                    }
                    else if (match[1].length === 4 && match[3].length <= 2) {
                        const year = match[1];
                        const month = match[2].padStart(2, '0');
                        const day = match[3].padStart(2, '0');
                        return `${day}${separator}${month}${separator}${year}`;
                    }
                    return match[0];
                }
            }
        }
        return undefined;
    }
    matchToEntities(extracted, bases, contracts, grades) {
        const result = { ...extracted };
        console.log('=== MATCHING DEBUG ===');
        console.log('Available bases:', bases.map(b => ({ codice: b.codice, nome: b.nome })));
        console.log('Available contracts:', contracts.map(c => ({ codice: c.codice, nome: c.nome })));
        console.log('Extracted baseId:', extracted.baseId);
        console.log('Extracted contrattoId:', extracted.contrattoId);
        console.log('Extracted gradeId:', extracted.gradeId);
        const baseId = extracted.baseId;
        if (baseId && baseId !== 'true' && baseId !== 'false') {
            const baseMatch = bases.find(b => b.codice.toLowerCase() === baseId.toLowerCase() ||
                b.nome.toLowerCase().includes(baseId.toLowerCase()) ||
                baseId.toLowerCase().includes(b.codice.toLowerCase()));
            if (baseMatch) {
                console.log('Base matched:', baseMatch.codice, '->', baseMatch.id);
                result.baseId = baseMatch.id;
            }
            else {
                console.log('Base NOT matched:', baseId);
            }
        }
        const contrattoId = extracted.contrattoId;
        if (contrattoId && contrattoId !== 'true' && contrattoId !== 'false') {
            const contractMatch = contracts.find(c => c.codice.toLowerCase() === contrattoId.toLowerCase() ||
                c.nome.toLowerCase().includes(contrattoId.toLowerCase()) ||
                contrattoId.toLowerCase().includes(c.codice.toLowerCase()));
            if (contractMatch) {
                console.log('Contract matched:', contractMatch.codice, '->', contractMatch.id);
                result.contrattoId = contractMatch.id;
            }
            else {
                console.log('Contract NOT matched:', contrattoId);
            }
        }
        else {
            console.log('Contract skipped (checkbox value):', contrattoId);
        }
        const gradeId = extracted.gradeId;
        if (gradeId) {
            const gradeMatch = grades.find(g => g.codice.toLowerCase() === gradeId.toLowerCase() ||
                g.nome.toLowerCase().includes(gradeId.toLowerCase()) ||
                gradeId.toLowerCase().includes(g.codice.toLowerCase()));
            if (gradeMatch) {
                result.gradeId = gradeMatch.id;
            }
        }
        return result;
    }
};
exports.PdfExtractionService = PdfExtractionService;
exports.PdfExtractionService = PdfExtractionService = __decorate([
    (0, common_1.Injectable)()
], PdfExtractionService);
//# sourceMappingURL=pdf-extraction.service.js.map