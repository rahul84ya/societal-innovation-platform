const pool = require('../config/db');
const { generateProblemEmbedding, serializeVector } = require('../services/embeddingService');

async function backfillEmbeddings() {
  const databaseClient = await pool.connect();

  try {
    const result = await databaseClient.query(
      `SELECT id, title, description
       FROM problems
       WHERE embedding IS NULL
       ORDER BY id;`
    );

    let processed = 0;

    for (const problem of result.rows) {
      const embedding = serializeVector(
        await generateProblemEmbedding(problem.title, problem.description)
      );

      await databaseClient.query(
        'UPDATE problems SET embedding = $1 WHERE id = $2;',
        [embedding, problem.id]
      );

      processed += 1;
      console.log(`Embedded problem #${problem.id} (${processed}/${result.rows.length}).`);
    }

    console.log(`Embedding backfill complete. Updated ${processed} problem(s).`);
  } finally {
    databaseClient.release();
    await pool.end();
  }
}

backfillEmbeddings().catch((error) => {
  console.error('Embedding backfill failed:', error.message);
  process.exitCode = 1;
});
