-- Adiciona campo isOpen na Company para controle manual de abertura pelo lojista
ALTER TABLE "Company" ADD COLUMN "isOpen" BOOLEAN NOT NULL DEFAULT false;
