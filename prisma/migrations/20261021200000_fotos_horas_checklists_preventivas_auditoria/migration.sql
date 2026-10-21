-- CreateEnum
CREATE TYPE "TipoAnexo" AS ENUM ('PROBLEMA', 'SERVICO');

-- CreateEnum
CREATE TYPE "UnidadeFrequencia" AS ENUM ('DIAS', 'SEMANAS', 'MESES');

-- AlterTable
ALTER TABLE "Equipamento" ADD COLUMN     "fabricante" TEXT,
ADD COLUMN     "modelo" TEXT,
ADD COLUMN     "numeroSerie" TEXT;

-- AlterTable
ALTER TABLE "Requisicao" ADD COLUMN     "maquinaParada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paradaFim" TIMESTAMP(3),
ADD COLUMN     "paradaInicio" TIMESTAMP(3),
ADD COLUMN     "planoId" TEXT;

-- CreateTable
CREATE TABLE "Anexo" (
    "id" TEXT NOT NULL,
    "requisicaoId" INTEGER NOT NULL,
    "autorId" TEXT NOT NULL,
    "tipo" "TipoAnexo" NOT NULL DEFAULT 'PROBLEMA',
    "mime" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,
    "miniatura" BYTEA NOT NULL,
    "largura" INTEGER NOT NULL,
    "altura" INTEGER NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anexo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apontamento" (
    "id" TEXT NOT NULL,
    "requisicaoId" INTEGER NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "minutos" INTEGER NOT NULL,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Apontamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistModelo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChecklistModelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistModeloItem" (
    "id" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "ChecklistModeloItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "requisicaoId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "feito" BOOLEAN NOT NULL DEFAULT false,
    "feitoPorId" TEXT,
    "feitoEm" TIMESTAMP(3),

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanoPreventivo" (
    "id" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "intervalo" INTEGER NOT NULL,
    "unidade" "UnidadeFrequencia" NOT NULL DEFAULT 'DIAS',
    "proximaData" TIMESTAMP(3) NOT NULL,
    "antecedenciaDias" INTEGER NOT NULL DEFAULT 3,
    "prioridade" "Prioridade" NOT NULL DEFAULT 'MEDIA',
    "responsavelId" TEXT,
    "checklistId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanoPreventivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "resumo" TEXT NOT NULL,
    "detalhes" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Anexo_requisicaoId_idx" ON "Anexo"("requisicaoId");

-- CreateIndex
CREATE INDEX "Apontamento_requisicaoId_idx" ON "Apontamento"("requisicaoId");

-- CreateIndex
CREATE INDEX "Apontamento_usuarioId_inicio_idx" ON "Apontamento"("usuarioId", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistModelo_nome_key" ON "ChecklistModelo"("nome");

-- CreateIndex
CREATE INDEX "ChecklistModeloItem_modeloId_ordem_idx" ON "ChecklistModeloItem"("modeloId", "ordem");

-- CreateIndex
CREATE INDEX "ChecklistItem_requisicaoId_ordem_idx" ON "ChecklistItem"("requisicaoId", "ordem");

-- CreateIndex
CREATE INDEX "PlanoPreventivo_ativo_proximaData_idx" ON "PlanoPreventivo"("ativo", "proximaData");

-- CreateIndex
CREATE INDEX "Auditoria_criadoEm_idx" ON "Auditoria"("criadoEm");

-- CreateIndex
CREATE INDEX "Auditoria_entidade_entidadeId_idx" ON "Auditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_criadoEm_idx" ON "Auditoria"("usuarioId", "criadoEm");

-- CreateIndex
CREATE INDEX "Requisicao_equipamentoId_idx" ON "Requisicao"("equipamentoId");

-- AddForeignKey
ALTER TABLE "Requisicao" ADD CONSTRAINT "Requisicao_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoPreventivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_requisicaoId_fkey" FOREIGN KEY ("requisicaoId") REFERENCES "Requisicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apontamento" ADD CONSTRAINT "Apontamento_requisicaoId_fkey" FOREIGN KEY ("requisicaoId") REFERENCES "Requisicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apontamento" ADD CONSTRAINT "Apontamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistModeloItem" ADD CONSTRAINT "ChecklistModeloItem_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "ChecklistModelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_requisicaoId_fkey" FOREIGN KEY ("requisicaoId") REFERENCES "Requisicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_feitoPorId_fkey" FOREIGN KEY ("feitoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoPreventivo" ADD CONSTRAINT "PlanoPreventivo_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoPreventivo" ADD CONSTRAINT "PlanoPreventivo_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoPreventivo" ADD CONSTRAINT "PlanoPreventivo_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ChecklistModelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
