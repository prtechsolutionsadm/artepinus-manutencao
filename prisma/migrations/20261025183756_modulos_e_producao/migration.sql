-- CreateEnum
CREATE TYPE "PerfilProducao" AS ENUM ('SUPERVISOR', 'APONTADOR', 'CONSULTA');

-- CreateEnum
CREATE TYPE "CentroParada" AS ENUM ('MEC', 'ELE', 'OPE');

-- CreateEnum
CREATE TYPE "TipoProduto" AS ENUM ('BOM', 'APROVEITAMENTO', 'REFUGO');

-- CreateEnum
CREATE TYPE "Mercado" AS ENUM ('EXTERNO', 'INTERNO');

-- CreateEnum
CREATE TYPE "StatusCiclo" AS ENUM ('EM_SECAGEM', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoEstoque" AS ENUM ('VERDE', 'EMPACOTADA');

-- AlterEnum
ALTER TYPE "Perfil" ADD VALUE 'SEM_ACESSO';

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "perfilProducao" "PerfilProducao";

-- CreateTable
CREATE TABLE "MotivoParada" (
    "id" TEXT NOT NULL,
    "codigo" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "centro" "CentroParada" NOT NULL,
    "equipamentoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MotivoParada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaProducao" (
    "id" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "metaDiariaM3" DOUBLE PRECISION NOT NULL,
    "horasDia" DOUBLE PRECISION NOT NULL,
    "rendimentoMeta" DOUBLE PRECISION,

    CONSTRAINT "MetaProducao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoletimProducao" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "metaM3" DOUBLE PRECISION NOT NULL,
    "horasProgramadas" DOUBLE PRECISION NOT NULL,
    "torasQtd" INTEGER,
    "torasM3" DOUBLE PRECISION,
    "diametroMedio" DOUBLE PRECISION,
    "comprimentoMedio" DOUBLE PRECISION,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoletimProducao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemProducao" (
    "id" TEXT NOT NULL,
    "boletimId" TEXT NOT NULL,
    "tipo" "TipoProduto" NOT NULL,
    "mercado" "Mercado" NOT NULL DEFAULT 'EXTERNO',
    "espessura" INTEGER NOT NULL,
    "largura" INTEGER NOT NULL,
    "comprimento" INTEGER NOT NULL,
    "pecas" INTEGER NOT NULL,
    "m3" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ItemProducao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParadaProducao" (
    "id" TEXT NOT NULL,
    "boletimId" TEXT NOT NULL,
    "motivoId" TEXT,
    "equipamentoId" TEXT,
    "centro" "CentroParada" NOT NULL,
    "ocorrencias" INTEGER NOT NULL DEFAULT 1,
    "minutos" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT,
    "requisicaoId" INTEGER,

    CONSTRAINT "ParadaProducao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estufa" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "capacidadeM3" DOUBLE PRECISION,
    "equipamentoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Estufa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CicloSecagem" (
    "id" TEXT NOT NULL,
    "estufaId" TEXT NOT NULL,
    "numero" INTEGER,
    "status" "StatusCiclo" NOT NULL DEFAULT 'EM_SECAGEM',
    "entrada" TIMESTAMP(3) NOT NULL,
    "previsaoSaida" TIMESTAMP(3),
    "saida" TIMESTAMP(3),
    "umidadeInicial" DOUBLE PRECISION,
    "umidadeFinal" DOUBLE PRECISION,
    "plantao" TEXT,
    "proximaCarga" TEXT,
    "observacoes" TEXT,
    "responsavelId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CicloSecagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargaCiclo" (
    "id" TEXT NOT NULL,
    "cicloId" TEXT NOT NULL,
    "espessura" INTEGER NOT NULL,
    "largura" TEXT NOT NULL,
    "comprimento" DOUBLE PRECISION NOT NULL,
    "grades" INTEGER NOT NULL,
    "m3" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CargaCiclo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemChecklistCiclo" (
    "id" TEXT NOT NULL,
    "cicloId" TEXT NOT NULL,
    "secao" TEXT,
    "texto" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "conforme" BOOLEAN,
    "observacao" TEXT,
    "marcadoPorId" TEXT,
    "marcadoEm" TIMESTAMP(3),

    CONSTRAINT "ItemChecklistCiclo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargaToras" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "origem" TEXT NOT NULL,
    "talhao" TEXT,
    "motorista" TEXT,
    "placa" TEXT,
    "comprimentoMedio" DOUBLE PRECISION,
    "observacoes" TEXT,
    "responsavelId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargaToras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCargaToras" (
    "id" TEXT NOT NULL,
    "cargaId" TEXT NOT NULL,
    "diametro" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "ItemCargaToras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevantamentoEstoque" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoEstoque" NOT NULL,
    "observacoes" TEXT,
    "responsavelId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevantamentoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemEstoque" (
    "id" TEXT NOT NULL,
    "levantamentoId" TEXT NOT NULL,
    "espessura" INTEGER NOT NULL,
    "largura" TEXT NOT NULL,
    "comprimento" DOUBLE PRECISION NOT NULL,
    "grades" INTEGER,
    "pacotes" INTEGER,
    "m3" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ItemEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MotivoParada_codigo_key" ON "MotivoParada"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "MetaProducao_mes_key" ON "MetaProducao"("mes");

-- CreateIndex
CREATE UNIQUE INDEX "BoletimProducao_data_key" ON "BoletimProducao"("data");

-- CreateIndex
CREATE INDEX "ItemProducao_boletimId_idx" ON "ItemProducao"("boletimId");

-- CreateIndex
CREATE INDEX "ParadaProducao_boletimId_idx" ON "ParadaProducao"("boletimId");

-- CreateIndex
CREATE INDEX "ParadaProducao_motivoId_idx" ON "ParadaProducao"("motivoId");

-- CreateIndex
CREATE UNIQUE INDEX "Estufa_numero_key" ON "Estufa"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Estufa_equipamentoId_key" ON "Estufa"("equipamentoId");

-- CreateIndex
CREATE INDEX "CicloSecagem_estufaId_entrada_idx" ON "CicloSecagem"("estufaId", "entrada");

-- CreateIndex
CREATE INDEX "CicloSecagem_status_idx" ON "CicloSecagem"("status");

-- CreateIndex
CREATE INDEX "CargaCiclo_cicloId_idx" ON "CargaCiclo"("cicloId");

-- CreateIndex
CREATE INDEX "ItemChecklistCiclo_cicloId_ordem_idx" ON "ItemChecklistCiclo"("cicloId", "ordem");

-- CreateIndex
CREATE INDEX "CargaToras_data_idx" ON "CargaToras"("data");

-- CreateIndex
CREATE INDEX "ItemCargaToras_cargaId_idx" ON "ItemCargaToras"("cargaId");

-- CreateIndex
CREATE INDEX "LevantamentoEstoque_tipo_data_idx" ON "LevantamentoEstoque"("tipo", "data");

-- CreateIndex
CREATE INDEX "ItemEstoque_levantamentoId_idx" ON "ItemEstoque"("levantamentoId");

-- AddForeignKey
ALTER TABLE "MotivoParada" ADD CONSTRAINT "MotivoParada_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoletimProducao" ADD CONSTRAINT "BoletimProducao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProducao" ADD CONSTRAINT "ItemProducao_boletimId_fkey" FOREIGN KEY ("boletimId") REFERENCES "BoletimProducao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParadaProducao" ADD CONSTRAINT "ParadaProducao_boletimId_fkey" FOREIGN KEY ("boletimId") REFERENCES "BoletimProducao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParadaProducao" ADD CONSTRAINT "ParadaProducao_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "MotivoParada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParadaProducao" ADD CONSTRAINT "ParadaProducao_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParadaProducao" ADD CONSTRAINT "ParadaProducao_requisicaoId_fkey" FOREIGN KEY ("requisicaoId") REFERENCES "Requisicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estufa" ADD CONSTRAINT "Estufa_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CicloSecagem" ADD CONSTRAINT "CicloSecagem_estufaId_fkey" FOREIGN KEY ("estufaId") REFERENCES "Estufa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CicloSecagem" ADD CONSTRAINT "CicloSecagem_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargaCiclo" ADD CONSTRAINT "CargaCiclo_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "CicloSecagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemChecklistCiclo" ADD CONSTRAINT "ItemChecklistCiclo_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "CicloSecagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemChecklistCiclo" ADD CONSTRAINT "ItemChecklistCiclo_marcadoPorId_fkey" FOREIGN KEY ("marcadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargaToras" ADD CONSTRAINT "CargaToras_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCargaToras" ADD CONSTRAINT "ItemCargaToras_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "CargaToras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevantamentoEstoque" ADD CONSTRAINT "LevantamentoEstoque_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemEstoque" ADD CONSTRAINT "ItemEstoque_levantamentoId_fkey" FOREIGN KEY ("levantamentoId") REFERENCES "LevantamentoEstoque"("id") ON DELETE CASCADE ON UPDATE CASCADE;
