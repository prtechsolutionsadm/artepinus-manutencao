import { NextRequest, NextResponse } from "next/server";
import { fotosDoForm } from "@/lib/fotos";
import { criarRequisicaoCompleta, novaRequisicaoSchema } from "@/lib/requisicoes";
import { usuarioAtual } from "@/lib/session";

/** Recebe as requisições que ficaram na fila do aparelho enquanto estava sem internet. */
export async function POST(req: NextRequest) {
  const eu = await usuarioAtual();
  if (!eu || eu.trocarSenha) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const form = await req.formData();
  const dados = novaRequisicaoSchema.safeParse(Object.fromEntries([...form.entries()].filter(([k]) => k !== "fotos")));
  if (!dados.success) return NextResponse.json({ erro: dados.error.issues[0].message }, { status: 422 });
  if (!dados.data.chaveOffline) return NextResponse.json({ erro: "Chave ausente" }, { status: 422 });

  try {
    const r = await criarRequisicaoCompleta(eu, dados.data, fotosDoForm(form), "offline");
    return NextResponse.json({ id: r.id });
  } catch (e) {
    console.error("Falha ao sincronizar requisição offline", e);
    return NextResponse.json({ erro: "Falha ao salvar" }, { status: 500 });
  }
}
