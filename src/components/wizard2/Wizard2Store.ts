import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WizardStep = 'documents' | 'client' | 'vessel' | 'type' | 'checklist' | 'review';

export interface WizardState {
  step: WizardStep;
  sessionId: string | null;
  companyId: string | null;
  customerId: string | null;
  secondaryCustomerId: string | null;
  vesselId: string | null;
  processTypeId: string | null;
  processTypeName: string | null;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  docPicks: string[]; 
  uploadedFiles: Record<string, any[]>; 
  ocrData: {
    isExtracting: boolean;
    confidence: number;
    extractedFields: Record<string, any>;
    lastExtractionType?: string;
  };

  brandingMode: 'none' | 'company' | 'customer' | 'exclusive';
  
  setStep: (step: WizardStep) => void;
  setData: (data: Partial<Omit<WizardState, 'setStep' | 'setData' | 'reset'>>) => void;
  reset: () => void;
  clearStepData: (step: WizardStep) => void;
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      step: 'documents',
      companyId: null,
      customerId: null,
      secondaryCustomerId: null,
      vesselId: null,
      processTypeId: null,
      processTypeName: null,
      title: '',
      priority: 'normal',
      docPicks: [],
      uploadedFiles: {},
      brandingMode: 'company',
      ocrData: {
        isExtracting: false,
        confidence: 0,
        extractedFields: {},
      },

      setStep: (step) => set({ step }),
      setData: (data) => set((state) => ({ ...state, ...data })),
      reset: () => set({
        step: 'documents',
        customerId: null,
        secondaryCustomerId: null,
        vesselId: null,
        processTypeId: null,
        processTypeName: null,
        title: '',
        priority: 'normal',
        docPicks: [],
        uploadedFiles: {},
        brandingMode: 'company',
        ocrData: {
          isExtracting: false,
          confidence: 0,
          extractedFields: {},
        },
      }),
      clearStepData: (step) => set((state) => {
        if (step === 'documents') return { ...state, uploadedFiles: {}, ocrData: { isExtracting: false, confidence: 0, extractedFields: {} } };
        if (step === 'client') return { ...state, customerId: null, vesselId: null };
        if (step === 'vessel') return { ...state, vesselId: null };
        if (step === 'type') return { ...state, processTypeId: null, processTypeName: null, docPicks: [], uploadedFiles: {} };
        return state;
      }),

    }),
    {
      name: 'navaldocs-wizard-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
