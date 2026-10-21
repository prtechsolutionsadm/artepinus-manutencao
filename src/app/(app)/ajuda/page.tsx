import type { Metadata } from "next";
import { ManualUsuario } from "@/components/ManualUsuario";
import { Titulo } from "@/components/ui";
import { PERFIL } from "@/lib/constantes";
import { EMPRESA } from "@/lib/empresa";
import { MANUAL } from "@/lib/manual";
import { pode } from "@/lib/permissoes";
import { exigirUsuario } from "@/lib/session";

export const metadata: Metadata = { title: "Manual do usuário" };

/** Manual do usuário: mostra só as seções que fazem sentido para o perfil de quem está logado. */
export default async function AjudaPage() {
  const eu = await exigirUsuario();
  const secoes = MANUAL.filter((s) => !s.para || pode(eu.perfil, s.para));

  return (
    <>
      <div className="mb-4 hidden items-center gap-3 border-b-2 border-marca-600 pb-3 print:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={EMPRESA.logo} alt="" className="h-12 w-auto" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-marca-600">{EMPRESA.razaoSocial}</div>
          <div className="text-lg font-bold">Manual do usuário · {EMPRESA.sistema}</div>
        </div>
      </div>
      <Titulo subtitulo={`Como usar o sistema de manutenção · conteúdo para o perfil ${PERFIL[eu.perfil]}`}>Manual do usuário</Titulo>
      <ManualUsuario secoes={secoes} />
    </>
  );
}
