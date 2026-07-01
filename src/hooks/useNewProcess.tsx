import { createContext, useContext, useState } from "react";
import { NewProcessWizard } from "@/components/NewProcessWizard";
import { AssembleProcessWizard } from "@/components/AssembleProcessWizard";
import { ProcessFirstWizard } from "@/components/ProcessFirstWizard";
import { NewProcessQuickDialog } from "@/components/processes/NewProcessQuickDialog";

const NewProcessContext = createContext<{
  setIsNewProcessOpen: (open: boolean) => void;
  setIsAssembleProcessOpen: (open: boolean) => void;
  setIsAdvancedProcessOpen: (open: boolean) => void;
} | undefined>(undefined);

export function NewProcessProvider({ children }: { children: React.ReactNode }) {
  // "isOpen" agora aponta para o novo QuickDialog (motor inteligente).
  // O ProcessFirstWizard vira o modo "avançado" e continua disponível.
  const [isOpen, setIsOpen] = useState(false);
  const [isFirstOpen, setIsFirstOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isAssembleOpen, setIsAssembleOpen] = useState(false);

  return (
    <NewProcessContext.Provider value={{
      setIsNewProcessOpen: setIsOpen,
      setIsAdvancedProcessOpen: setIsFirstOpen,
      setIsAssembleProcessOpen: setIsAssembleOpen,
    }}>
      {children}
      <NewProcessQuickDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onOpenAdvanced={() => setIsFirstOpen(true)}
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
