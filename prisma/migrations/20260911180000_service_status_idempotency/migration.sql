-- CreateIndex
CREATE UNIQUE INDEX "service_statuses_lineId_source_recordedAt_key" ON "service_statuses"("lineId", "source", "recordedAt");
