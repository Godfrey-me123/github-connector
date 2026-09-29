import React, { useState, useEffect, useMemo } from 'react';
import { X, Eye, Sparkles, CheckCircle2 } from 'lucide-react';
import { CardTemplate } from '../types';
import { applyTemplateMapping } from '../utils/templateMappingEngine';
import { renderTemplateToCanvas } from '../utils/export';
import { useTemplateStore } from '../store/useTemplateStore';

interface SampleDataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: CardTemplate;
}

export const SampleDataPreviewModal: React.FC<SampleDataPreviewModalProps> = ({
  isOpen,
  onClose,
  template: propTemplate,
}) => {
  const { currentTemplate, activeServiceId } = useTemplateStore();
  const activeTemplate = propTemplate || currentTemplate;

  const [previewImage, setPreviewImage] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(true);

  // Generate realistic sample data based on active service
  const sampleData = useMemo(() => {
    if (activeServiceId === 'driving_license') {
      return {
        serviceId: 'driving_license',
        firstName: 'JUMA',
        middleName: 'ALLY',
        thirdName: 'RASHIDI',
        secondName: 'ALLY',
        lastName: 'RASHIDI',
        given_names: 'JUMA ALLY',
        family_name: 'RASHIDI',
        first_name: 'JUMA',
        middle_name: 'ALLY',
        dob: '15/08/1988',
        dateOfBirth: '15/08/1988',
        dateOfIssue: '01/01/2024',
        issue_date: '01/01/2024',
        dateOfExpiry: '01/01/2029',
        expiry_date: '01/01/2029',
        region: 'DAR ES SALAAM',
        licenceNumber: 'TZ-DL-9876543',
        licence_number: 'TZ-DL-9876543',
        pinNumber: '109-876-543',
        pin_number: '109-876-543',
        gender: 'MALE',
        nationality: 'TANZANIAN',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
        signature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iNTAiPjxwYXRoIGQ9Ik0xMCAzMCBRIDMwIDEwIDUwIDMwIFQgOTAgMzAgVCAxMzAgMzAiIHN0cm9rZT0iIzA5MGIxMCIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PC9zdmc+',
        classes_list: 'A - Motorcycles\nB - Private Vehicles\nC - Public Service',
        class_A: 'VALID',
        class_B: 'VALID',
        class_C: 'VALID',
        classes: [
          { classCode: 'A', enabled: true, issueDate: '01/01/2024', expiryDate: '01/01/2029' },
          { classCode: 'B', enabled: true, issueDate: '01/01/2024', expiryDate: '01/01/2029' },
          { classCode: 'C', enabled: true, issueDate: '01/01/2024', expiryDate: '01/01/2029' },
        ],
      };
    }

    if (activeServiceId === 'passport') {
      return {
        serviceId: 'passport',
        firstName: 'AMINA',
        middleName: 'HASSAN',
        lastName: 'KIMARO',
        dob: '20/05/1992',
        gender: 'FEMALE',
        nationality: 'TANZANIAN',
        passport_number: 'AB123456',
        issue_date: '10/02/2023',
        expiry_date: '10/02/2033',
        place_of_birth: 'DODOMA',
        authority: 'IMMIGRATION TANZANIA',
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        signature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iNTAiPjxwYXRoIGQ9Ik0xMCAzMCBRIDMwIDEwIDUwIDMwIFQgOTAgMzAgVCAxMzAgMzAiIHN0cm9rZT0iIzA5MGIxMCIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PC9zdmc+',
      };
    }

    if (activeServiceId === 'tin') {
      return {
        serviceId: 'tin',
        taxpayer_name: 'BAKARI SAIDI MASOUD',
        tin_number: '123-456-789',
        tax_office: 'ILALA TAX REGION',
        registration_date: '12/03/2020',
        business_name: 'BAKARI ENTERPRISES LTD',
      };
    }

    if (activeServiceId === 'birth_certificate') {
      return {
        serviceId: 'birth_certificate',
        child_name: 'EMMANUEL JOSEPH MBILINYI',
        dob: '05/11/2015',
        gender: 'MALE',
        place_of_birth: 'DAR ES SALAAM',
        father_name: 'JOSEPH MBILINYI',
        mother_name: 'MARY MBILINYI',
        entry_number: 'BC-987654',
        registration_date: '10/11/2015',
      };
    }

    // Default NIDA Sample Data
    return {
      serviceId: 'nida',
      firstName: 'JUMA',
      middleName: 'ALLY',
      lastName: 'RASHIDI',
      firstMiddleName: 'JUMA ALLY',
      dob: '15/08/1988',
      gender: 'MALE',
      nidaNumber: '19880815-12345-00001-12',
      id_number: '19880815-12345-00001-12',
      card_expiry: '15/08/2028',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      signature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iNTAiPjxwYXRoIGQ9Ik0xMCAzMCBRIDMwIDEwIDUwIDMwIFQgOTAgMzAgVCAxMzAgMzAiIHN0cm9rZT0iIzA5MGIxMCIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PC9zdmc+',
    };
  }, [activeServiceId]);

  const mappedResult = useMemo(() => {
    return applyTemplateMapping(activeTemplate, sampleData as any);
  }, [activeTemplate, sampleData]);

  const previewTemplate = mappedResult.populatedTemplate || activeTemplate;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsRendering(true);

    renderTemplateToCanvas(previewTemplate)
      .then((canvas) => {
        if (isMounted) {
          setPreviewImage(canvas.toDataURL('image/png'));
          setIsRendering(false);
        }
      })
      .catch((err) => {
        console.error('Failed to render sample preview canvas:', err);
        if (isMounted) setIsRendering(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, previewTemplate]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/60 backdrop-blur-xs p-4 animate-in fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FFFFFF] border border-[#E7E9EB] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E7E9EB] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#CEE9E9] border border-[#a1d3d3] flex items-center justify-center text-[#000000]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#000000] flex items-center gap-2">
                <span>Sample Data Template Preview</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-bold bg-[#E7E9EB] text-[#000000]">
                  {activeServiceId.replace('_', ' ')}
                </span>
              </h3>
              <p className="text-[11px] text-[#555555]">
                Testing live template variable bindings with realistic sample data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#E7E9EB] text-[#000000] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex flex-col items-center justify-center bg-[#F1F5F9] min-h-[360px]">
          {isRendering ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <div className="w-8 h-8 border-3 border-[#000000] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-[#555555]">Rendering High-Resolution Canvas...</span>
            </div>
          ) : previewImage ? (
            <div className="relative bg-white rounded-xl shadow-xl border border-[#CBD5E1] p-3 flex flex-col items-center justify-center">
              <img
                src={previewImage}
                alt="Sample Card Preview"
                className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          ) : (
            <div className="text-xs text-red-600 font-semibold">Failed to render card preview.</div>
          )}

          {/* Validation Metrics */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#000000]">
            <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-[#E7E9EB] shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mapped Fields: {mappedResult.populatedCount}</span>
            </span>
            <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-[#E7E9EB] shadow-2xs">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Total Layers: {previewTemplate.layers.length}</span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E7E9EB] bg-white flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#000000] hover:bg-[#222222] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
