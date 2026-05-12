import { createContext, useContext, useState } from "react";
import { NewProcessWizard } from "@/components/NewProcessWizard";

const NewProcessContext = createContext<{
  setIsNewProcessOpen: (open: boolean) => void;
} | undefined>(undefined);

export function NewProcessProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <NewProcessContext.Provider value={{ setIsNewProcessOpen: setIsOpen }}>
      {children}
      <NewProcessWizard isOpen={isOpen} onClose={() => setIsOpen(false)} />
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
