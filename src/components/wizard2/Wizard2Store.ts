import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WizardStep = 'documents' | 'client' | 'vessel' | 'type' | 'checklist' | 'review';

export interface WizardState {
  step: WizardStep;
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
      step: 'client',
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

      setStep: (step) => set({ step }),
      setData: (data) => set((state) => ({ ...state, ...data })),
      reset: () => set({
        step: 'client',
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
      }),
      clearStepData: (step) => set((state) => {
        if (step === 'client') return { ...state, customerId: null, vesselId: null, uploadedFiles: {} };
        if (step === 'vessel') return { ...state, vesselId: null, uploadedFiles: {} };
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
