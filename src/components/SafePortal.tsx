import * as React from "react";
import { createPortal } from "react-dom";

interface SafePortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
}

/**
 * SafePortal ensures that the portal is only rendered on the client
 * and handles cleanup gracefully to prevent "removeChild" errors.
 */
export const SafePortal = ({ children, container }: SafePortalProps) => {
  const [mounted, setMounted] = React.useState(false);
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
    setPortalContainer(container || document.body);
    
    console.log("SAFE_PORTAL_READY");
    
    return () => {
      setMounted(false);
    };
  }, [container]);

  if (!mounted || !portalContainer) {
    return null;
  }

  try {
    return createPortal(children, portalContainer);
  } catch (error) {
    console.error("Portal error caught in SafePortal", error);
    return null;
  }
};
