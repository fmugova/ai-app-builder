-- CreateTable
CREATE TABLE "CustomDomain" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verificationKey" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "sslStatus" TEXT NOT NULL DEFAULT 'pending',
    "sslIssuedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'supabase',
    "host" TEXT,
    "port" INTEGER,
    "database" TEXT,
    "username" TEXT,
    "password" TEXT,
    "supabaseUrl" TEXT,
    "supabaseAnonKey" TEXT,
    "supabaseServiceKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseTable" (
    "id" TEXT NOT NULL,
    "databaseConnectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomDomain_domain_key" ON "CustomDomain"("domain");

-- CreateIndex
CREATE INDEX "CustomDomain_projectId_idx" ON "CustomDomain"("projectId");

-- CreateIndex
CREATE INDEX "CustomDomain_domain_idx" ON "CustomDomain"("domain");

-- CreateIndex
CREATE INDEX "CustomDomain_status_idx" ON "CustomDomain"("status");

-- CreateIndex
CREATE INDEX "DatabaseConnection_userId_idx" ON "DatabaseConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseConnection_projectId_key" ON "DatabaseConnection"("projectId");

-- CreateIndex
CREATE INDEX "DatabaseConnection_projectId_idx" ON "DatabaseConnection"("projectId");

-- CreateIndex
CREATE INDEX "DatabaseTable_databaseConnectionId_idx" ON "DatabaseTable"("databaseConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseTable_databaseConnectionId_name_key" ON "DatabaseTable"("databaseConnectionId", "name");

-- AddForeignKey
ALTER TABLE "CustomDomain" ADD CONSTRAINT "CustomDomain_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseConnection" ADD CONSTRAINT "DatabaseConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseConnection" ADD CONSTRAINT "DatabaseConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseTable" ADD CONSTRAINT "DatabaseTable_databaseConnectionId_fkey" FOREIGN KEY ("databaseConnectionId") REFERENCES "DatabaseConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;