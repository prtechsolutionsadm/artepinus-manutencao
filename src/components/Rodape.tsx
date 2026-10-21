import { CREDITO, direitos } from "@/lib/empresa";

/** Créditos: direitos da Artepinus e desenvolvimento da PR Tech Solutions. */
export function Rodape({ className = "", claro }: { className?: string; claro?: boolean }) {
  return (
    <footer className={`text-center text-xs leading-relaxed ${claro ? "text-marca-100/70" : "text-stone-400"} ${className}`}>
      <p>{direitos()}</p>
      <p>{CREDITO}</p>
    </footer>
  );
}
