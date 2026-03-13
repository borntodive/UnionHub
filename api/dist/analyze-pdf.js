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
const pdf_lib_1 = require("pdf-lib");
const fs = __importStar(require("fs"));
async function analyzePdf() {
    try {
        const buffer = fs.readFileSync('test-pdf.pdf');
        const pdf = await pdf_lib_1.PDFDocument.load(buffer);
        const form = pdf.getForm();
        const fields = form.getFields();
        console.log('\n========================================');
        console.log(`Trovati ${fields.length} campi nel PDF`);
        console.log('========================================\n');
        fields.forEach((field, i) => {
            const name = field.getName();
            const type = field.constructor.name;
            let value = '';
            try {
                if (type.includes('TextField')) {
                    const textField = form.getTextField(name);
                    value = textField.getText() || '(vuoto)';
                }
                else if (type.includes('Dropdown')) {
                    const dropdown = form.getDropdown(name);
                    value = dropdown.getSelected() || '(vuoto)';
                }
                else if (type.includes('CheckBox')) {
                    const checkbox = form.getCheckBox(name);
                    value = checkbox.isChecked() ? '[X]' : '[ ]';
                }
                else if (type.includes('RadioGroup')) {
                    const radio = form.getRadioGroup(name);
                    value = radio.getSelected() || '(vuoto)';
                }
            }
            catch (e) {
                value = '(errore lettura)';
            }
            console.log(`${String(i + 1).padStart(2)}. ${name}`);
            console.log(`    Tipo: ${type}`);
            console.log(`    Valore: ${value}`);
            console.log('');
        });
        console.log('\n========================================');
        console.log('SUGGERIMENTO MAPPING PER IL CODICE');
        console.log('========================================\n');
        const suggestedMappings = {};
        fields.forEach(field => {
            const name = field.getName().toLowerCase();
            if (name.includes('nome') && !name.includes('cognome')) {
                suggestedMappings['nome'] = [field.getName()];
            }
            else if (name.includes('cognome')) {
                suggestedMappings['cognome'] = [field.getName()];
            }
            else if (name.includes('codice') || name.includes('id') || name.includes('crew')) {
                suggestedMappings['crewcode'] = [field.getName()];
            }
            else if (name.includes('email') || name.includes('mail')) {
                suggestedMappings['email'] = [field.getName()];
            }
            else if (name.includes('tel') || name.includes('cell') || name.includes('phone')) {
                suggestedMappings['telefono'] = [field.getName()];
            }
            else if (name.includes('base') || name.includes('aeroporto')) {
                suggestedMappings['base'] = [field.getName()];
            }
            else if (name.includes('contratto') || name.includes('contract')) {
                suggestedMappings['contratto'] = [field.getName()];
            }
            else if (name.includes('grado') || name.includes('grade') || name.includes('qualifica')) {
                suggestedMappings['grade'] = [field.getName()];
            }
        });
        console.log(JSON.stringify(suggestedMappings, null, 2));
    }
    catch (error) {
        console.error('Errore:', error.message);
        console.log('\nAssicurati di aver copiato il PDF come );
    }
}
//# sourceMappingURL=analyze-pdf.js.map