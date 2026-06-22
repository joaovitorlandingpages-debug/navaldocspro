import { createContext, useContext, useState } from "react";
import { NewProcessWizard } from "@/components/NewProcessWizard";
import { AssembleProcessWizard } from "@/components/AssembleProcessWizard";
import { ProcessFirstWizard } from "@/components/ProcessFirstWizard";

const NewProcessContext = createContext<{
  setIsNewProcessOpen: (open: boolean) => void;
  setIsAssembleProcessOpen: (open: boolean) => void;
  setIsAdvancedProcessOpen: (open: boolean) => void;
} | undefined>(undefined);

export function NewProcessProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isAssembleOpen, setIsAssembleOpen] = useState(false);

  return (
    <NewProcessContext.Provider value={{
      setIsNewProcessOpen: setIsOpen,
      setIsAdvancedProcessOpen: setIsAdvancedOpen,
      setIsAssembleProcessOpen: setIsAssembleOpen,
    }}>
      {children}
      <ProcessFirstWizard isOpen={isOpen} onClose={() => setIsOpen(false)} />
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
