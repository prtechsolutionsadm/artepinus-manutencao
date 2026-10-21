-- Quem criou o plano de preventiva (aparece como solicitante das requisições geradas)
ALTER TABLE "PlanoPreventivo" ADD COLUMN "criadoPorId" TEXT NOT NULL;
ALTER TABLE "PlanoPreventivo" ADD CONSTRAINT "PlanoPreventivo_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
