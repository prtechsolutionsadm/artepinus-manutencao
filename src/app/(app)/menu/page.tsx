import type { Metadata } from "next";
import { cookies } from "next/headers";
import { BotaoSair } from "@/components/BotaoSair";
import { MenuCelular } from "@/components/Navegacao";
import { sair } from "@/app/actions/auth";
import { PERFIL, PERFIL_PRODUCAO } from "@/lib/constantes";
import { COOKIE_MODULO, iniciais, menusDoUsuario, moduloSalvo } from "@/lib/menu";
import { temModulo } from "@/lib/permissoes";
import { exigirUsuario } from "@/lib/session";

export const metadata: Metadata = { title: "Menu" };

/** Menu completo no celular (a barra inferior só tem os atalhos principais). */
export default async function MenuPage() {
  const eu = await exigirUsuario();
  const perfis = [
    temModulo(eu, "manutencao") ? PERFIL[eu.perfil] : null,
    eu.perfilProducao && eu.perfil !== "ADMIN" && eu.perfil !== "GERENTE" ? `Produção: ${PERFIL_PRODUCAO[eu.perfilProducao]}` : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-marca-100 text-lg font-semibold text-marca-700">{iniciais(eu.nome)}</span>
        <div>
          <div className="text-lg font-semibold leading-tight">{eu.nome}</div>
          <div className="text-sm text-stone-500">
            <span className="font-mono">{eu.login}</span> · {perfis.join(" · ")}
          </div>
        </div>
      </div>
      <MenuCelular menus={menusDoUsuario(eu)} salvo={moduloSalvo((await cookies()).get(COOKIE_MODULO)?.value)} />
      <BotaoSair sair={sair} variante="botao" />
    </div>
  );
}
