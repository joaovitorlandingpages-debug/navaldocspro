import { createContext, useContext, useState } from "react";
import { NewProcessWizard } from "@/components/NewProcessWizard";
import { AssembleProcessWizard } from "@/components/AssembleProcessWizard";
import { ProcessFirstWizard } from "@/components/ProcessFirstWizard";
import { NewProcessQuickDialog } from "@/components/processes/NewProcessQuickDialog";
import { NewProcessChooserDialog } from "@/components/processes/NewProcessChooserDialog";
import { NewProcessUploadWizard } from "@/components/processes/NewProcessUploadWizard";

interface Ctx {
  setIsNewProcessOpen: (open: boolean) => void;
  setIsAssembleProcessOpen: (open: boolean) => void;
  setIsAdvancedProcessOpen: (open: boolean) => void;
  openGuidedProcess: () => void;
  openUploadProcess: () => void;
}
const NewProcessContext = createContext<Ctx | undefined>(undefined);

export function NewProcessProvider({ children }: { children: React.ReactNode }) {
  // Novo: o botão "Novo Processo" abre um chooser (Guiado × Upload).
  const [chooserOpen, setChooserOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isFirstOpen, setIsFirstOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isAssembleOpen, setIsAssembleOpen] = useState(false);

  return (
    <NewProcessContext.Provider value={{
      setIsNewProcessOpen: setChooserOpen,
      setIsAdvancedProcessOpen: setIsFirstOpen,
      setIsAssembleProcessOpen: setIsAssembleOpen,
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
        onOpenAdvanced={() => setIsFirstOpen(true)}
      />
      <NewProcessUploadWizard
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
      <ProcessFirstWizard isOpen={isFirstOpen} onClose={() => setIsFirstOpen(false)} />
      <NewProcessWizard isOpen={isAdvancedOpen} onClose={() => setIsAdvancedOpen(false)} />
      <AssembleProcessWizard isOpen={isAssembleOpen} onClose={() => setIsAssembleOpen(false)} />
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
