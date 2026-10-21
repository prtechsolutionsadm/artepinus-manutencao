import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { PRIORIDADE, STATUS, STATUS_HEX, TIPO, numeroRequisicao } from "@/lib/constantes";
import { CREDITO, EMPRESA, direitos } from "@/lib/empresa";
import { formatarDataCurta, gerarRelatorio } from "@/lib/relatorio";
import { usuarioAtual } from "@/lib/session";
import { pode } from "@/lib/permissoes";
import type { StatusRequisicao, TipoManutencao } from "@/generated/prisma/enums";

const VERDE = "FF177009";
const borda: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD6D3D1" } },
  bottom: { style: "thin", color: { argb: "FFD6D3D1" } },
  left: { style: "thin", color: { argb: "FFD6D3D1" } },
  right: { style: "thin", color: { argb: "FFD6D3D1" } },
};
const argb = (hex: string) => `FF${hex.replace("#", "").toUpperCase()}`;
// Datas no Excel sem fuso: desloca para o horário de Brasília.
const local = (d: Date | null) => (d ? new Date(d.getTime() - 3 * 60 * 60 * 1000) : null);

export async function GET(req: NextRequest) {
  const eu = await usuarioAtual();
  if (!eu || eu.trocarSenha) return NextResponse.redirect(new URL("/login", req.url));
  if (!pode(eu.perfil, "relatorios")) return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  const rel = await gerarRelatorio(Object.fromEntries(req.nextUrl.searchParams));
  const f = rel.filtros;

  const wb = new ExcelJS.Workbook();
  wb.creator = `${EMPRESA.razaoSocial} - ${EMPRESA.sistema}`;
  wb.company = EMPRESA.razaoSocial;
  wb.description = `${direitos()} ${CREDITO}`;
  wb.created = new Date();

  const ws = wb.addWorksheet("Requisições", {
    views: [{ state: "frozen", ySplit: 6 }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    headerFooter: { oddFooter: `&L&8${direitos()}&R&8${CREDITO} · página &P de &N` },
  });
  ws.columns = [
    { key: "id", width: 10 },
    { key: "abertura", width: 17 },
    { key: "titulo", width: 42 },
    { key: "descricao", width: 50 },
    { key: "setor", width: 16 },
    { key: "equip", width: 26 },
    { key: "tipo", width: 12 },
    { key: "prioridade", width: 11 },
    { key: "status", width: 18 },
    { key: "solicitante", width: 20 },
    { key: "responsavel", width: 20 },
    { key: "agendada", width: 17 },
    { key: "conclusao", width: 17 },
    { key: "solucao", width: 50 },
  ];

  // Cabeçalho com logo
  try {
    const logo = await readFile(path.join(process.cwd(), "public", EMPRESA.logoPng));
    const id = wb.addImage({ buffer: logo as unknown as ExcelJS.Buffer, extension: "png" });
    ws.addImage(id, { tl: { col: 0.1, row: 0.2 }, ext: { width: 96, height: 65 } }); // proporção do logo ≈ 1,48
  } catch {
    // sem logo: segue sem imagem
  }
  ws.getRow(1).height = 26;
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 18;
  ws.mergeCells("B1:N1");
  ws.mergeCells("B2:N2");
  ws.mergeCells("B3:N3");
  Object.assign(ws.getCell("B1"), { value: `Relatório de Manutenção · ${EMPRESA.razaoSocial}` });
  ws.getCell("B1").font = { bold: true, size: 16, color: { argb: VERDE } };
  ws.getCell("B2").value =
    `Período: ${formatarDataCurta(f.de)} a ${formatarDataCurta(f.ate)} (data de abertura)` +
    (rel.descricaoFiltros.length ? ` · ${rel.descricaoFiltros.join(" · ")}` : "");
  ws.getCell("B2").font = { size: 11, color: { argb: "FF57534E" } };
  ws.getCell("B3").value =
    `Total: ${rel.resumo.total} · Concluídas: ${rel.resumo.concluidas} · Pendentes: ${rel.resumo.pendentes} · ` +
    `Canceladas: ${rel.resumo.canceladas} · CNPJ ${EMPRESA.cnpj} · Gerado por ${eu.nome} em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;
  ws.getCell("B3").font = { size: 10, color: { argb: "FF78716C" } };

  const cab = ws.getRow(6);
  cab.values = ["Nº", "Abertura", "Título", "Descrição", "Setor", "Equipamento", "Tipo", "Prioridade", "Status", "Solicitante", "Responsável", "Agendada", "Conclusão", "Serviço realizado"];
  cab.height = 22;
  cab.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
    c.alignment = { vertical: "middle" };
    c.border = borda;
  });

  rel.itens.forEach((r, i) => {
    const row = ws.addRow({
      id: numeroRequisicao(r.id),
      abertura: local(r.criadoEm),
      titulo: r.titulo,
      descricao: r.descricao,
      setor: r.setor?.nome ?? "",
      equip: r.equipamento ? `${r.equipamento.codigo} – ${r.equipamento.nome}` : "",
      tipo: TIPO[r.tipo],
      prioridade: PRIORIDADE[r.prioridade].label,
      status: STATUS[r.status].label,
      solicitante: r.solicitante.nome,
      responsavel: r.responsavel?.nome ?? "",
      agendada: local(r.dataAgendada),
      conclusao: local(r.dataConclusao),
      solucao: r.solucao ?? "",
    });
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell({ includeEmpty: true }, (c) => {
      c.border = borda;
      if (i % 2) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F4" } };
    });
    for (const k of ["abertura", "agendada", "conclusao"]) row.getCell(k).numFmt = "dd/mm/yyyy hh:mm";
    const st = row.getCell("status");
    st.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(STATUS_HEX[r.status]) } };
    st.font = { bold: true, color: { argb: "FFFFFFFF" } };
    if (r.prioridade === "URGENTE") row.getCell("prioridade").font = { bold: true, color: { argb: "FFDC2626" } };
  });
  ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: 14 } };
  ws.addRow([]);
  const credito = ws.addRow([`${direitos()} ${CREDITO}`]);
  credito.font = { size: 9, italic: true, color: { argb: "FF78716C" } };

  // Aba de resumo
  const rs = wb.addWorksheet("Resumo");
  rs.columns = [{ width: 28 }, { width: 12 }, { width: 10 }];
  rs.addRow([`${EMPRESA.razaoSocial} · Resumo`]).font = { bold: true, size: 14, color: { argb: VERDE } };
  rs.addRow([`Período: ${formatarDataCurta(f.de)} a ${formatarDataCurta(f.ate)}`]);
  const bloco = (titulo: string, linhas: [string, number, string?][]) => {
    rs.addRow([]);
    const h = rs.addRow([titulo, "Qtd.", "%"]);
    h.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
    });
    for (const [rotulo, n, cor] of linhas) {
      const l = rs.addRow([rotulo, n, rel.resumo.total ? n / rel.resumo.total : 0]);
      l.getCell(3).numFmt = "0%";
      if (cor) {
        l.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(cor) } };
        l.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      }
      l.eachCell({ includeEmpty: true }, (c) => (c.border = borda));
    }
  };
  bloco("Status", rel.porStatus.map(([s, n]) => [STATUS[s as StatusRequisicao].label, n, STATUS_HEX[s as StatusRequisicao]]));
  bloco("Tipo", rel.porTipo.map(([t, n]) => [TIPO[t as TipoManutencao], n]));
  bloco("Setor", rel.porSetor.map(([s, n]) => [s, n]));
  rs.addRow([]);
  rs.addRow([
    "Tempo médio para concluir (dias)",
    rel.resumo.diasMedios === null ? "—" : Number(rel.resumo.diasMedios.toFixed(1)),
  ]).font = { bold: true };
  rs.addRow([]);
  rs.addRow([`${direitos()} ${CREDITO}`]).font = { size: 9, italic: true, color: { argb: "FF78716C" } };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="relatorio-manutencao-${f.de}_a_${f.ate}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
