import * as React from "react";

// Breakpoints consistentes com a solicitação do usuário
// mobile: até 640px
// tablet: 641px a 1024px
// desktop: acima de 1024px
export const MOBILE_BREAKPOINT = 640;
export const TABLET_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT + 1}px) and (max-width: ${TABLET_BREAKPOINT}px)`);
    const onChange = () => {
      setIsTablet(window.innerWidth > MOBILE_BREAKPOINT && window.innerWidth <= TABLET_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsTablet(window.innerWidth > MOBILE_BREAKPOINT && window.innerWidth <= TABLET_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isTablet;
}

