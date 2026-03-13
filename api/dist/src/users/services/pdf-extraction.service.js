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
    },
};
let PdfExtractionService = class PdfExtractionService {
    async extractFromPdf(pdfBuffer, role) {
        try {
            const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer);
            const form = pdfDoc.getForm();
            const fields = form.getFields();
            const rawFields = {};
            const extracted = {
                extractionMethod: 'form_fields',
                confidence: 0,
            };
            for (const field of fields) {
                const name = field.getName().toLowerCase().trim();
                let value = '';
                try {
                    const fieldType = field.constructor.name;
                    if (fieldType.includes('TextField')) {
                        const textField = form.getTextField(field.getName());
                        value = textField.getText() || '';
                    }
                    else if (fieldType.includes('Dropdown')) {
                        const dropdown = form.getDropdown(field.getName());
                        value = dropdown.getSelected() || '';
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
                }
            }
            const mapping = FIELD_MAPPINGS[role] || FIELD_MAPPINGS[ruolo_enum_1.Ruolo.PILOT];
            let matchedFields = 0;
            let totalFields = 0;
            for (const [targetField, possibleNames] of Object.entries(mapping)) {
                totalFields++;
                for (const possibleName of possibleNames) {
                    if (rawFields[possibleName]) {
                        extracted[targetField] = rawFields[possibleName];
                        matchedFields++;
                        break;
                    }
                    const partialMatch = Object.keys(rawFields).find(key => key.includes(possibleName) || possibleName.includes(key));
                    if (partialMatch) {
                        extracted[targetField] = rawFields[partialMatch];
                        matchedFields++;
                        break;
                    }
                }
            }
            const confidence = totalFields > 0 ? matchedFields / totalFields : 0;
            return {
                crewcode: extracted.crewcode,
                nome: extracted.nome,
                cognome: extracted.cognome,
                email: extracted.email,
                telefono: extracted.telefono,
                baseId: extracted.base,
                contrattoId: extracted.contratto,
                gradeId: extracted.grade,
                confidence,
                extractionMethod: confidence > 0.3 ? 'form_fields' : 'manual',
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
    matchToEntities(extracted, bases, contracts, grades) {
        const result = { ...extracted };
        if (extracted.baseId) {
            const baseMatch = bases.find(b => b.codice.toLowerCase() === extracted.baseId.toLowerCase() ||
                b.nome.toLowerCase().includes(extracted.baseId.toLowerCase()) ||
                extracted.baseId.toLowerCase().includes(b.codice.toLowerCase()));
            if (baseMatch) {
                result.baseId = baseMatch.id;
            }
        }
        if (extracted.contrattoId) {
            const contractMatch = contracts.find(c => c.codice.toLowerCase() === extracted.contrattoId.toLowerCase() ||
                c.nome.toLowerCase().includes(extracted.contrattoId.toLowerCase()) ||
                extracted.contrattoId.toLowerCase().includes(c.codice.toLowerCase()));
            if (contractMatch) {
                result.contrattoId = contractMatch.id;
            }
        }
        if (extracted.gradeId) {
            const gradeMatch = grades.find(g => g.codice.toLowerCase() === extracted.gradeId.toLowerCase() ||
                g.nome.toLowerCase().includes(extracted.gradeId.toLowerCase()) ||
                extracted.gradeId.toLowerCase().includes(g.codice.toLowerCase()));
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