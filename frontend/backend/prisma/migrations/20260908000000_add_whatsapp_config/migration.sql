ALTER TABLE "User" ADD COLUMN "chavePix" TEXT;
ALTER TABLE "User" ADD COLUMN "whatsappMsg5Dias" TEXT;
ALTER TABLE "User" ADD COLUMN "whatsappMsgVencido" TEXT;
ALTER TABLE "User" ADD COLUMN "whatsappAutoEnviar" BOOLEAN NOT NULL DEFAULT false;
