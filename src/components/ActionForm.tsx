"use client";

import { useActionState, useEffect, useRef, startTransition } from "react";
import type { EstadoForm } from "@/app/actions/auth";

type Props = {
  action: (estado: EstadoForm, form: FormData) => Promise<EstadoForm>;
  children: React.ReactNode;
  className?: string;
  /** Limpa o formulário quando a ação retorna sucesso. */
  limparAoSalvar?: boolean;
  /** Chamado após sucesso (ex.: fechar um <details>). */
  aoSalvar?: () => void;
};

/**
 * Formulário ligado a uma Server Action. Diferente do <form action>, não limpa os
 * campos quando há erro de validação, e mostra a mensagem de erro/sucesso.
 */
export function ActionForm({ action, children, className, limparAoSalvar, aoSalvar }: Props) {
  const [estado, executar, pendente] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) {
      if (limparAoSalvar) ref.current?.reset();
      aoSalvar?.();
    }
  }, [estado, limparAoSalvar, aoSalvar]);

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => executar(dados));
      }}
    >
      <fieldset disabled={pendente} className="contents">
        {children}
      </fieldset>
      {estado?.erro && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
          {estado.ok}
        </p>
      )}
    </form>
  );
}

export function BotaoEnviar({ children, className = "btn-primario" }: { children: React.ReactNode; className?: string }) {
  return (
    <button type="submit" className={className}>
      {children}
    </button>
  );
}
