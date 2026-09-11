-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('TUBE', 'OVERGROUND', 'ELIZABETH_LINE', 'DLR', 'BUS', 'TRAM');

-- CreateEnum
CREATE TYPE "StopType" AS ENUM ('HUB', 'STATION', 'PLATFORM');

-- CreateEnum
CREATE TYPE "ServiceStatusLevel" AS ENUM ('GOOD_SERVICE', 'MINOR_DELAYS', 'SEVERE_DELAYS', 'PART_CLOSURE', 'SUSPENDED', 'SPECIAL_SERVICE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "networks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "TransportMode" NOT NULL,
    "color" TEXT,
    "networkId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stopType" "StopType" NOT NULL,
    "parentId" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_stops" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "line_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_statuses" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "status" "ServiceStatusLevel" NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "networks_name_key" ON "networks"("name");

-- CreateIndex
CREATE INDEX "lines_mode_idx" ON "lines"("mode");

-- CreateIndex
CREATE UNIQUE INDEX "lines_source_externalRef_key" ON "lines"("source", "externalRef");

-- CreateIndex
CREATE INDEX "stops_stopType_idx" ON "stops"("stopType");

-- CreateIndex
CREATE INDEX "stops_parentId_idx" ON "stops"("parentId");

-- CreateIndex
CREATE INDEX "stops_name_idx" ON "stops"("name");

-- CreateIndex
CREATE UNIQUE INDEX "stops_source_externalRef_key" ON "stops"("source", "externalRef");

-- CreateIndex
CREATE INDEX "line_stops_lineId_sequence_idx" ON "line_stops"("lineId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "line_stops_lineId_stopId_key" ON "line_stops"("lineId", "stopId");

-- CreateIndex
CREATE INDEX "service_statuses_lineId_recordedAt_idx" ON "service_statuses"("lineId", "recordedAt");

-- AddForeignKey
ALTER TABLE "lines" ADD CONSTRAINT "lines_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "networks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stops" ADD CONSTRAINT "stops_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_stops" ADD CONSTRAINT "line_stops_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_stops" ADD CONSTRAINT "line_stops_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_statuses" ADD CONSTRAINT "service_statuses_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
