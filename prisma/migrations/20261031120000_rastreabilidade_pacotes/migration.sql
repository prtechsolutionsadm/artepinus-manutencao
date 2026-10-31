-- CreateEnum
CREATE TYPE "TipoOrigem" AS ENUM ('PROPRIA', 'ARRENDADA', 'TERCEIRO');

-- CreateEnum
CREATE TYPE "StatusPacote" AS ENUM ('VERDE', 'EM_ESTUFA', 'SECO', 'EXPEDIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('CRIADO', 'ENTRADA_ESTUFA', 'SAIDA_ESTUFA', 'MOVIMENTADO', 'EXPEDIDO', 'OBSERVACAO', 'ALTERADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "CargaToras" ADD COLUMN     "colheitaId" TEXT,
ADD COLUMN     "numero" SERIAL NOT NULL;

-- CreateTable
CREATE TABLE "OrigemFlorestal" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoOrigem" NOT NULL DEFAULT 'TERCEIRO',
    "proprietario" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "especie" TEXT,
    "anoPlantio" INTEGER,
    "areaHa" DOUBLE PRECISION,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrigemFlorestal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Colheita" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "origemId" TEXT NOT NULL,
    "talhao" TEXT,
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "equipe" TEXT,
    "idadeAnos" INTEGER,
    "volumeEstimadoM3" DOUBLE PRECISION,
    "documento" TEXT,
    "observacoes" TEXT,
    "responsavelId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Colheita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pacote" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "status" "StatusPacote" NOT NULL,
    "boletimId" TEXT,
    "cicloId" TEXT,
    "espessura" INTEGER NOT NULL,
    "largura" INTEGER NOT NULL,
    "comprimento" INTEGER NOT NULL,
    "pecas" INTEGER NOT NULL,
    "m3" DOUBLE PRECISION NOT NULL,
    "classe" TEXT,
    "mercado" "Mercado" NOT NULL DEFAULT 'EXTERNO',
    "umidade" DOUBLE PRECISION,
    "localizacao" TEXT,
    "cliente" TEXT,
    "notaFiscal" TEXT,
    "destino" TEXT,
    "expedidoEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pacote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoPacote" (
    "id" TEXT NOT NULL,
    "pacoteId" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoPacote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ConsumoToras" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ConsumoToras_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MadeiraCiclo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MadeiraCiclo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Colheita_numero_key" ON "Colheita"("numero");

-- CreateIndex
CREATE INDEX "Colheita_origemId_inicio_idx" ON "Colheita"("origemId", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "Pacote_numero_key" ON "Pacote"("numero");

-- CreateIndex
CREATE INDEX "Pacote_status_idx" ON "Pacote"("status");

-- CreateIndex
CREATE INDEX "Pacote_boletimId_idx" ON "Pacote"("boletimId");

-- CreateIndex
CREATE INDEX "Pacote_cicloId_idx" ON "Pacote"("cicloId");

-- CreateIndex
CREATE INDEX "Pacote_criadoEm_idx" ON "Pacote"("criadoEm");

-- CreateIndex
CREATE INDEX "EventoPacote_pacoteId_criadoEm_idx" ON "EventoPacote"("pacoteId", "criadoEm");

-- CreateIndex
CREATE INDEX "_ConsumoToras_B_index" ON "_ConsumoToras"("B");

-- CreateIndex
CREATE INDEX "_MadeiraCiclo_B_index" ON "_MadeiraCiclo"("B");

-- CreateIndex
CREATE UNIQUE INDEX "CargaToras_numero_key" ON "CargaToras"("numero");

-- AddForeignKey
ALTER TABLE "CargaToras" ADD CONSTRAINT "CargaToras_colheitaId_fkey" FOREIGN KEY ("colheitaId") REFERENCES "Colheita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colheita" ADD CONSTRAINT "Colheita_origemId_fkey" FOREIGN KEY ("origemId") REFERENCES "OrigemFlorestal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colheita" ADD CONSTRAINT "Colheita_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pacote" ADD CONSTRAINT "Pacote_boletimId_fkey" FOREIGN KEY ("boletimId") REFERENCES "BoletimProducao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pacote" ADD CONSTRAINT "Pacote_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "CicloSecagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pacote" ADD CONSTRAINT "Pacote_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoPacote" ADD CONSTRAINT "EventoPacote_pacoteId_fkey" FOREIGN KEY ("pacoteId") REFERENCES "Pacote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoPacote" ADD CONSTRAINT "EventoPacote_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConsumoToras" ADD CONSTRAINT "_ConsumoToras_A_fkey" FOREIGN KEY ("A") REFERENCES "BoletimProducao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConsumoToras" ADD CONSTRAINT "_ConsumoToras_B_fkey" FOREIGN KEY ("B") REFERENCES "CargaToras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MadeiraCiclo" ADD CONSTRAINT "_MadeiraCiclo_A_fkey" FOREIGN KEY ("A") REFERENCES "BoletimProducao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MadeiraCiclo" ADD CONSTRAINT "_MadeiraCiclo_B_fkey" FOREIGN KEY ("B") REFERENCES "CicloSecagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
