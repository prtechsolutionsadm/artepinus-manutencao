import { redirect } from "next/navigation";
import { exigirUsuario, inicioDe } from "@/lib/session";

/** Entrada do sistema (botão do site e app instalado): vai para o módulo do usuário. */
export default async function SistemaPage() {
  redirect(inicioDe(await exigirUsuario()));
}
