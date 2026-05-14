CREATE TYPE "ServerStatus" AS ENUM ('ACTIVE', 'TROUBLE', 'DOWN');

CREATE TABLE "ServiceServer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "ServerStatus" NOT NULL DEFAULT 'ACTIVE',
  "note" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ServiceServer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceServer_name_key" ON "ServiceServer"("name");

INSERT INTO "ServiceServer" ("id", "name", "status", "updatedAt", "createdAt")
VALUES
  ('srv_jombok', 'Server Jombok', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('srv_kepung', 'Server Kepung', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('srv_pare', 'Server Pare', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
