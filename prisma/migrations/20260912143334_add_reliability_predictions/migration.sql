-- CreateTable
CREATE TABLE "reliability_predictions" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "predictedAt" TIMESTAMP(3) NOT NULL,
    "targetWindowStart" TIMESTAMP(3) NOT NULL,
    "targetWindowEnd" TIMESTAMP(3) NOT NULL,
    "predictedGoodServicePercent" DOUBLE PRECISION NOT NULL,
    "algorithmVersion" INTEGER NOT NULL,
    "actualGoodServicePercent" DOUBLE PRECISION,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reliability_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reliability_predictions_lineId_targetWindowEnd_idx" ON "reliability_predictions"("lineId", "targetWindowEnd");

-- CreateIndex
CREATE UNIQUE INDEX "reliability_predictions_lineId_source_targetWindowStart_tar_key" ON "reliability_predictions"("lineId", "source", "targetWindowStart", "targetWindowEnd");

-- AddForeignKey
ALTER TABLE "reliability_predictions" ADD CONSTRAINT "reliability_predictions_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
