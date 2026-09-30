import { CardTemplate, Layer, TextLayer, ImageLayer, PlaceholderLayer, QRCodeLayer } from '../types';
import { NidaFormData, SupportedBinding } from './templateMappingEngine';
import { matchLayerToBinding, isGenderLabelLayer, isGenderValueLayer, replaceGenderInText, replaceTextTokens, isBackSideTemplate } from './templateMappingEngine';

export interface FieldMappingReportItem {
  fieldId: SupportedBinding;
  fieldLabel: string;
  formValue: string;
  templateId: string;
  templateName: string;
  layerId: string;
  layerName: string;
  side: 'Front' | 'Back';
  layerType: 'text' | 'image' | 'placeholder' | 'qrcode' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  // Typography (for text layers)
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  textAlign?: string;
  // Final Result
  finalRenderedValue: string;
  // Image metadata (for photo / signature)
  imageMetadata?: {
    imageFieldId: string;
    originalFileType: string;
    originalDimensions: string;
    targetX: number;
    targetY: number;
    targetWidth: number;
    targetHeight: number;
    scalingMode: string;
    transparencyStatus: string;
  };
}

export interface TemplateInspectionReport {
  frontReport: FieldMappingReportItem[];
  backReport: FieldMappingReportItem[];
  allReportItems: FieldMappingReportItem[];
  unmappedBindings: SupportedBinding[];
  timestamp: string;
}

/**
 * Inspects a template against NidaFormData and produces an exact mapping report
 */
export function inspectTemplateMapping(
  frontTemplate: CardTemplate,
  backTemplate: CardTemplate | null,
  formData: NidaFormData
): TemplateInspectionReport {
  const f = formData.firstName?.trim() || '';
  const m = formData.middleName?.trim() || '';
  const combined = m ? `${f} ${m}` : f;

  const bindings: { id: SupportedBinding; label: string; rawValue: string }[] = [
    { id: 'FIRST_MIDDLE_NAME', label: 'First Name + Middle Name', rawValue: combined },
    { id: 'FIRST_NAME', label: 'First Name', rawValue: formData.firstName || '' },
    { id: 'MIDDLE_NAME', label: 'Middle Name', rawValue: formData.middleName || '' },
    { id: 'LAST_NAME', label: 'Last Name', rawValue: formData.lastName || '' },
    { id: 'DOB', label: 'Date of Birth', rawValue: formData.dob || '' },
    { id: 'GENDER', label: 'Gender / Sex', rawValue: formData.gender || '' },
    { id: 'NIDA_NUMBER', label: 'NIDA Number', rawValue: formData.nidaNumber || '' },
    { id: 'PHOTO', label: 'Passport Photo', rawValue: formData.photoUrl ? 'Photo provided (DataURL)' : 'Not uploaded' },
    { id: 'SIGNATURE', label: 'Signature', rawValue: formData.signatureUrl ? 'Signature provided (DataURL)' : 'Not drawn/uploaded' },
  ];

  const frontItems: FieldMappingReportItem[] = [];
  const backItems: FieldMappingReportItem[] = [];
  const mappedBindings = new Set<SupportedBinding>();

  const targetGender: 'M' | 'F' = (formData.gender || '').trim().toUpperCase().startsWith('F') ? 'F' : 'M';

  // Helper to inspect one template side
  const processSide = (template: CardTemplate, side: 'Front' | 'Back', destList: FieldMappingReportItem[]) => {
    for (const bindingDef of bindings) {
      // Rule: GENDER belongs to Front only, unless Back explicitly contains a gender layer
      if (bindingDef.id === 'GENDER' && side === 'Back') {
        const hasExplicitGender = template.layers.some(
          (l) => l.type === 'text' && isGenderValueLayer(l, template.layers)
        );
        if (!hasExplicitGender) continue;
      }

      // Find matching layer in this template
      const matchedLayer = template.layers.find((l) => matchLayerToBinding(l, bindingDef.id, template.layers));

      if (matchedLayer) {
        mappedBindings.add(bindingDef.id);

        let finalValue = '';
        let imageMeta: FieldMappingReportItem['imageMetadata'] = undefined;

        if (matchedLayer.type === 'text') {
          const tl = matchedLayer as TextLayer;
          if (bindingDef.id === 'GENDER') {
            finalValue = targetGender;
          } else {
            finalValue = replaceTextTokens(tl.text, formData);
            if (finalValue === tl.text) {
              if (bindingDef.id === 'FIRST_MIDDLE_NAME') finalValue = combined.toUpperCase();
              else if (bindingDef.id === 'FIRST_NAME') finalValue = (formData.firstName || '').toUpperCase();
              else if (bindingDef.id === 'MIDDLE_NAME') finalValue = (formData.middleName || '').toUpperCase();
              else if (bindingDef.id === 'LAST_NAME') finalValue = (formData.lastName || '').toUpperCase();
              else if (bindingDef.id === 'DOB') finalValue = formData.dob || '';
              else if (bindingDef.id === 'NIDA_NUMBER') finalValue = formData.nidaNumber || '';
            }
          }

          destList.push({
            fieldId: bindingDef.id,
            fieldLabel: bindingDef.label,
            formValue: bindingDef.id === 'GENDER' ? (formData.gender || 'Male') : bindingDef.rawValue,
            templateId: template.id,
            templateName: template.templateName,
            layerId: matchedLayer.id,
            layerName: matchedLayer.name,
            side,
            layerType: 'text',
            x: matchedLayer.x,
            y: matchedLayer.y,
            width: matchedLayer.width,
            height: matchedLayer.height,
            fontFamily: tl.fontFamily || 'Inter',
            fontSize: tl.fontSize || 12,
            fontWeight: tl.fontWeight || 'normal',
            textAlign: tl.align || 'left',
            finalRenderedValue: finalValue,
          });
        } else if (matchedLayer.type === 'image' || matchedLayer.type === 'placeholder') {
          const isPhoto = bindingDef.id === 'PHOTO';
          const srcUrl = isPhoto ? formData.photoUrl : formData.signatureUrl;

          let fileType = 'Unknown';
          let dims = 'Standard 3:4 Aspect';
          let transparency = 'N/A';

          if (srcUrl) {
            if (srcUrl.startsWith('data:image/png')) fileType = 'image/png';
            else if (srcUrl.startsWith('data:image/jpeg') || srcUrl.startsWith('data:image/jpg')) fileType = 'image/jpeg';
            else if (srcUrl.startsWith('data:image/webp')) fileType = 'image/webp';
            else fileType = 'External URL / Vector';

            if (!isPhoto) {
              transparency = 'Alpha Channel Preserved (100% Transparent Background)';
              dims = 'Dynamic Bounding Box';
            } else {
              transparency = 'Opaque / Cleaned Passport Canvas';
              dims = '35 × 45 mm (Standard)';
            }
          }

          imageMeta = {
            imageFieldId: bindingDef.id,
            originalFileType: fileType,
            originalDimensions: dims,
            targetX: matchedLayer.x,
            targetY: matchedLayer.y,
            targetWidth: matchedLayer.width,
            targetHeight: matchedLayer.height,
            scalingMode: isPhoto ? 'cover (preserve aspect)' : 'contain (fit with alpha)',
            transparencyStatus: transparency,
          };

          destList.push({
            fieldId: bindingDef.id,
            fieldLabel: bindingDef.label,
            formValue: bindingDef.rawValue,
            templateId: template.id,
            templateName: template.templateName,
            layerId: matchedLayer.id,
            layerName: matchedLayer.name,
            side,
            layerType: matchedLayer.type as 'image' | 'placeholder',
            x: matchedLayer.x,
            y: matchedLayer.y,
            width: matchedLayer.width,
            height: matchedLayer.height,
            finalRenderedValue: srcUrl ? `[Rendered ${bindingDef.label} Image]` : '[Empty]',
            imageMetadata: imageMeta,
          });
        } else if (matchedLayer.type === 'qrcode') {
          destList.push({
            fieldId: bindingDef.id,
            fieldLabel: `${bindingDef.label} (QR Code)`,
            formValue: bindingDef.rawValue,
            templateId: template.id,
            templateName: template.templateName,
            layerId: matchedLayer.id,
            layerName: matchedLayer.name,
            side,
            layerType: 'qrcode',
            x: matchedLayer.x,
            y: matchedLayer.y,
            width: matchedLayer.width,
            height: matchedLayer.height,
            finalRenderedValue: `QR Code: ${formData.nidaNumber || 'NIDA_DATA'}`,
          });
        }
      }
    }
  };

  // Inspect front
  processSide(frontTemplate, 'Front', frontItems);

  // Inspect back if available
  if (backTemplate) {
    processSide(backTemplate, 'Back', backItems);
  }

  const allReportItems = [...frontItems, ...backItems];
  const unmappedBindings = bindings
    .map((b) => b.id)
    .filter((id) => !mappedBindings.has(id));

  return {
    frontReport: frontItems,
    backReport: backItems,
    allReportItems,
    unmappedBindings,
    timestamp: new Date().toISOString(),
  };
}
