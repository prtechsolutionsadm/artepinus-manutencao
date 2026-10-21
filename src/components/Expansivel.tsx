"use client";

import { useEffect, useRef } from "react";

/**
 * <details> que só usa `abertoInicial` na primeira renderização. Assim ele não fecha
 * sozinho quando a página é atualizada depois de salvar (e a mensagem continua visível).
 */
export function Expansivel({ abertoInicial = false, className, children }: { abertoInicial?: boolean; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (abertoInicial && ref.current) ref.current.open = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  );
}
