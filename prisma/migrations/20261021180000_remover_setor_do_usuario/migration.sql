-- Usuários não têm mais setor; o setor fica no equipamento (e na requisição)
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_setorId_fkey";
ALTER TABLE "Usuario" DROP COLUMN "setorId";
