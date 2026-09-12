ALTER TABLE financial_ledger
  DROP CONSTRAINT IF EXISTS financial_ledger_tranche_number_check;

ALTER TABLE financial_ledger
  ADD CONSTRAINT financial_ledger_tranche_number_check
  CHECK (tranche_number BETWEEN 1 AND 4);