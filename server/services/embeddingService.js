const pool = require('../config/db');

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

function buildEmbeddingText(title, description) {
  return `Title: ${String(title || '').trim()}\nDescription: ${String(description || '').trim()}`.trim();
}

async function callOllama(path, body) {
  const response = await fetch(`${ollamaBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Ollama ${path} failed with HTTP ${response.status}.`);
  }

  return response.json();
}

async function generateProblemEmbedding(title, description) {
  const input = buildEmbeddingText(title, description);

  if (!input) {
    throw new Error('Cannot generate an embedding for an empty problem.');
  }

  const response = await callOllama('/api/embeddings', {
    model: embeddingModel,
    prompt: input,
  });
  const embedding = response.embedding;

  if (!Array.isArray(embedding) || embedding.length !== 768) {
    throw new Error('Ollama returned an unexpected embedding size.');
  }

  return embedding;
}

function serializeVector(embedding) {
  return `[${embedding.join(',')}]`;
}

async function findSimilarProblems(textDescription) {
  if (!textDescription || !String(textDescription).trim()) {
    return [];
  }

  try {
    const queryEmbedding = serializeVector(await generateProblemEmbedding('', textDescription));
    const vectorResult = await pool.query(
      `SELECT p.*,
              1 - (p.embedding <=> $1::vector) AS similarity_score
       FROM problems p
       WHERE p.problem_status <> 'rejected_by_govt'
         AND p.embedding IS NOT NULL
       ORDER BY p.embedding <=> $1::vector
       LIMIT 3;`,
      [queryEmbedding]
    );

    if (vectorResult.rows.length > 0) {
      return vectorResult.rows;
    }
  } catch (error) {
    console.error('Ollama vector search failed; using keyword fallback:', error.message);
  }

  try {
    const result = await pool.query(
      `SELECT p.*, ts_rank(
          to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.description, '')),
          plainto_tsquery('english', $1)
        ) AS similarity_score
       FROM problems p
       WHERE p.problem_status <> 'rejected_by_govt'
         AND to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.description, ''))
             @@ plainto_tsquery('english', $1)
       ORDER BY similarity_score DESC, p.id DESC
       LIMIT 3;`,
      [String(textDescription).trim()]
    );

    return result.rows;
  } catch (error) {
    console.error('Keyword similarity search failed:', error.message);
    return [];
  }
}

module.exports = {
  findSimilarProblems,
  generateProblemEmbedding,
  serializeVector,
};
