import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { CheckCheck } from "lucide-react";
import { marcarTodasLidas } from "@/app/actions/notificacoes";
import { Titulo, Vazio } from "@/components/ui";
import { formatarData } from "@/lib/constantes";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";

export const metadata: Metadata = { title: "Notificações" };

async function lerTodas() {
  "use server";
  await marcarTodasLidas();
  revalidatePath("/notificacoes");
}

export default async function NotificacoesPage() {
  const eu = await exigirUsuario();
  const itens = await db.notificacao.findMany({ where: { usuarioId: eu.id }, orderBy: { criadoEm: "desc" }, take: 100 });
  const naoLidas = itens.filter((n) => !n.lida).length;

  return (
    <div className="mx-auto max-w-2xl">
      <Titulo
        subtitulo={naoLidas ? `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}` : "Tudo em dia"}
        acao={
          naoLidas > 0 && (
            <form action={lerTodas}>
              <button className="btn-secundario">
                <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
              </button>
            </form>
          )
        }
      >
        Notificações
      </Titulo>
      {itens.length === 0 ? (
        <Vazio>Você ainda não recebeu notificações.</Vazio>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs">
          {itens.map((n) => (
            <li key={n.id}>
              <Link href={n.link ?? "#"} className={`flex gap-3 px-4 py-3.5 hover:bg-stone-50 sm:px-5 ${n.lida ? "" : "bg-marca-50/50"}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.lida ? "bg-stone-200" : "bg-marca-600"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block ${n.lida ? "text-stone-700" : "font-semibold"}`}>{n.titulo}</span>
                  <span className="block text-sm text-stone-500">{n.mensagem}</span>
                  <span className="mt-0.5 block text-xs text-stone-400">{formatarData(n.criadoEm, true)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
