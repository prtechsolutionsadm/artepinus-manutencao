-- Requisições abertas sem internet: chave do aparelho para não duplicar no reenvio
ALTER TABLE "Requisicao" ADD COLUMN "chaveOffline" TEXT;
CREATE UNIQUE INDEX "Requisicao_chaveOffline_key" ON "Requisicao"("chaveOffline");
