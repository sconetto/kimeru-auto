# FENABRAVE Monthly Import Runbook

FENABRAVE publishes monthly vehicle registration statistics. The data powers
the "Mais Vendidos" page, sales badges, and comparison sales sections.

## When

The 5th–10th business day of each month, after FENABRAVE publishes the
previous month's report.

## How

1. **Download the report** from the
   [FENABRAVE portal](https://www.fenabrave.org.br/portalv2/emplacamentos):
   - Select the target month
   - Download the **"Automóveis e Comerciais Leves"** XLSX file
2. **Import via admin panel**:
   - Go to `/admin/imports`
   - Upload the XLSX file
   - Review the results summary:
     - **Imported**: rows matched to catalog models
     - **Unmatched**: model names not recognized — these need catalog entries
       or manual mapping
3. **Handle unmatched models** (if any):
   - Create the missing model in `/admin/cars` if it's a real new model
   - Re-import the file
4. **Verify** the public page `/mais-vendidos` shows the new month's data

## Expected Output

- 100+ rows imported (the full top-50+ ranking)
- Zero or few unmatched rows
- "Mais Vendidos" page shows the correct month label

## Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| "Nenhuma linha de venda reconhecida" | FENABRAVE changed the file format — check the header row detection in `src/lib/fenabrave/parser.ts` |
| Many unmatched rows | Catalog model names don't match FENABRAVE naming — rename or add models |
| Import succeeds but page is stale | ISR cache (1h) — wait or trigger `revalidatePath` |
