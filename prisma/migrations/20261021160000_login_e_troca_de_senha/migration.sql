-- Login passa a ser "nome.sobrenome" em vez de e-mail
ALTER TABLE "Usuario" RENAME COLUMN "email" TO "login";
ALTER INDEX "Usuario_email_key" RENAME TO "Usuario_login_key";

-- Troca de senha obrigatória no próximo acesso
ALTER TABLE "Usuario" ADD COLUMN "trocarSenha" BOOLEAN NOT NULL DEFAULT false;
