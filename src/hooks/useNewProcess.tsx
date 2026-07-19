import { createContext, useContext, useState } from "react";
import { NewProcessQuickDialog } from "@/components/processes/NewProcessQuickDialog";
import { ProcessWizard2 } from "@/components/wizard2/ProcessWizard2";
import { NewProcessChooserDialog } from "@/components/processes/NewProcessChooserDialog";
import { NewProcessUploadWizard } from "@/components/processes/NewProcessUploadWizard";

interface Ctx {
  /** Abre o Chooser oficial (Guiado × Upload). */
  setIsNewProcessOpen: (open: boolean) => void;
  /**
   * @deprecated Fluxo antigo "Montagem Automática" foi removido.
   * Mantido apenas por compatibilidade — abre o novo Upload Wizard.
   */
  setIsAssembleProcessOpen: (open: boolean) => void;
  /**
   * @deprecated Fluxo antigo "Modo avançado" foi removido.
   * Mantido apenas por compatibilidade — abre o novo Upload Wizard.
   */
  setIsAdvancedProcessOpen: (open: boolean) => void;
  openGuidedProcess: () => void;
  openUploadProcess: () => void;
}
const NewProcessContext = createContext<Ctx | undefined>(undefined);

export function NewProcessProvider({ children }: { children: React.ReactNode }) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [wizard2Open, setWizard2Open] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const openUpload = (open: boolean) => setUploadOpen(open);

  return (
    <NewProcessContext.Provider value={{
      setIsNewProcessOpen: setChooserOpen,
      // Compat: qualquer chamada antiga cai no fluxo oficial de Upload.
      setIsAdvancedProcessOpen: openUpload,
      setIsAssembleProcessOpen: openUpload,
      openGuidedProcess: () => setQuickOpen(true),
      openUploadProcess: () => setUploadOpen(true),
    }}>
      {children}
      <NewProcessChooserDialog
        isOpen={chooserOpen}
        onClose={() => setChooserOpen(false)}
        onPickGuided={() => { setChooserOpen(false); setQuickOpen(true); }}
        onPickUpload={() => { setChooserOpen(false); setUploadOpen(true); }}
      />
      <NewProcessQuickDialog
        isOpen={quickOpen}
        onClose={() => setQuickOpen(false)}
        onOpenAdvanced={() => setUploadOpen(true)}
      />
      <NewProcessUploadWizard
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
    </NewProcessContext.Provider>
  );
}

export function useNewProcess() {
  const context = useContext(NewProcessContext);
  if (!context) {
    throw new Error("useNewProcess must be used within a NewProcessProvider");
  }
  return context;
}
