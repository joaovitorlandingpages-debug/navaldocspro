import { createContext, useContext, useState } from "react";
import { NewProcessWizard } from "@/components/NewProcessWizard";
import { AssembleProcessWizard } from "@/components/AssembleProcessWizard";

const NewProcessContext = createContext<{
  setIsNewProcessOpen: (open: boolean) => void;
  setIsAssembleProcessOpen: (open: boolean) => void;
} | undefined>(undefined);

export function NewProcessProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAssembleOpen, setIsAssembleOpen] = useState(false);

  return (
    <NewProcessContext.Provider value={{ 
      setIsNewProcessOpen: setIsOpen,
      setIsAssembleProcessOpen: setIsAssembleOpen
    }}>
      {children}
      <NewProcessWizard isOpen={isOpen} onClose={() => setIsOpen(false)} />
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
