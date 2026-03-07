-- supabase/migrations/add_aeo_report.sql
-- Run this migration to add the aeo_report column to your reports table
-- Apply via: supabase db push  OR  paste into Supabase SQL Editor

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS aeo_report JSONB DEFAULT NULL;

-- Optional: index for querying AEO score
CREATE INDEX IF NOT EXISTS idx_reports_aeo_score
  ON reports ((aeo_report->>'overallScore'));

-- Optional: index for AEO readiness status
CREATE INDEX IF NOT EXISTS idx_reports_aeo_readiness
  ON reports ((aeo_report->>'aeoReadiness'));

COMMENT ON COLUMN reports.aeo_report IS
  'Answer Engine Optimization analysis results (AEOReport JSON)';
