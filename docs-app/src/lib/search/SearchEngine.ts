import type {
  Document,
  SearchIndex,
  IndexedDocument,
  SearchResult,
  TextMatch,
  SearchFilters,
  IndexMetadata,
} from '../../types';

/**
 * SearchEngine - Full-text search with TF-IDF ranking
 */
export class SearchEngine {
  private index: SearchIndex;
  private resultCache: Map<string, { results: SearchResult[]; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.index = {
      documents: [],
      invertedIndex: {},
      metadata: {
        totalDocuments: 0,
        totalTokens: 0,
        lastIndexed: new Date().toISOString(),
      },
    };
    this.resultCache = new Map();
  }

  /**
   * Tokenize text into searchable tokens
   */
  private tokenize(text: string): string[] {
    // Convert to lowercase and split on non-word characters
    // Support Unicode for multilingual content (Russian, English, etc.)
    return text
      .toLowerCase()
      .split(/[\s\p{P}]+/u)
      .filter((token) => token.length > 1); // Filter out single characters
  }

  /**
   * Calculate TF (Term Frequency) for a token in a document
   */
  private calculateTF(token: string, tokens: string[]): number {
    const count = tokens.filter((t) => t === token).length;
    return count / tokens.length;
  }

  /**
   * Calculate IDF (Inverse Document Frequency) for a token
   */
  private calculateIDF(token: string): number {
    const postings = this.index.invertedIndex[token];
    if (!postings) return 0;

    const docsWithToken = postings.documentIds.length;
    const totalDocs = this.index.metadata.totalDocuments;

    if (docsWithToken === 0) return 0;

    return Math.log(totalDocs / docsWithToken);
  }

  /**
   * Index a collection of documents
   */
  async indexContent(documents: Document[]): Promise<void> {
    try {
      this.index.documents = [];
      this.index.invertedIndex = {};

      const successfullyIndexed: IndexedDocument[] = [];
      const errors: Array<{ docId: string; error: string }> = [];

      for (const doc of documents) {
        try {
          // Tokenize document content
          const tokens = this.tokenize(`${doc.title} ${doc.content}`);

          // Create indexed document
          const indexedDoc: IndexedDocument = {
            id: doc.id,
            title: doc.title,
            content: doc.content,
            section: doc.section,
            path: doc.path,
            tokens,
            metadata: {
              wordCount: tokens.length,
              headings: doc.metadata.headings || [],
              tags: doc.metadata.tags || [],
            },
          };

          successfullyIndexed.push(indexedDoc);

          // Build inverted index
          tokens.forEach((token, position) => {
            if (!this.index.invertedIndex[token]) {
              this.index.invertedIndex[token] = {
                documentIds: [],
                positions: {},
                idf: 0,
              };
            }

            const postings = this.index.invertedIndex[token];

            // Add document ID if not already present
            if (!postings.documentIds.includes(doc.id)) {
              postings.documentIds.push(doc.id);
            }

            // Track token positions in document
            if (!postings.positions[doc.id]) {
              postings.positions[doc.id] = [];
            }
            postings.positions[doc.id].push(position);
          });
        } catch (error) {
          // Log error but continue indexing other documents
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ docId: doc.id, error: errorMessage });
          console.error(`[SearchEngine] Failed to index document ${doc.id}:`, errorMessage);
        }
      }

      this.index.documents = successfullyIndexed;

      // Calculate IDF for all tokens
      Object.keys(this.index.invertedIndex).forEach((token) => {
        this.index.invertedIndex[token].idf = this.calculateIDF(token);
      });

      // Update metadata
      this.index.metadata = {
        totalDocuments: successfullyIndexed.length,
        totalTokens: Object.keys(this.index.invertedIndex).length,
        lastIndexed: new Date().toISOString(),
      };

      // Log summary
      if (errors.length > 0) {
        console.warn(
          `[SearchEngine] Indexed ${successfullyIndexed.length}/${documents.length} documents. ${errors.length} failed.`
        );
      } else {
        console.log(`[SearchEngine] Successfully indexed ${successfullyIndexed.length} documents`);
      }

      // Clear cache after reindexing
      this.resultCache.clear();
    } catch (error) {
      // Critical error - log but don't throw to allow app to continue
      console.error('[SearchEngine] Critical indexing error:', error);
      // Keep partial index if any documents were indexed
      if (this.index.documents.length === 0) {
        // Reset to empty index
        this.index = {
          documents: [],
          invertedIndex: {},
          metadata: {
            totalDocuments: 0,
            totalTokens: 0,
            lastIndexed: new Date().toISOString(),
          },
        };
      }
    }
  }

  /**
   * Search for documents matching the query
   */
  search(query: string, filters?: SearchFilters): SearchResult[] {
    if (!query || query.length < 2) {
      return [];
    }

    // Create cache key
    const cacheKey = `${query}:${JSON.stringify(filters || {})}`;

    // Check cache
    const cached = this.resultCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.results;
    }

    const startTime = performance.now();

    // Tokenize query
    const queryTokens = this.tokenize(query);

    if (queryTokens.length === 0) {
      return [];
    }

    // Calculate scores for each document
    const scores = new Map<string, number>();

    for (const token of queryTokens) {
      const postings = this.index.invertedIndex[token];
      if (!postings) continue;

      const idf = postings.idf;

      for (const docId of postings.documentIds) {
        const doc = this.index.documents.find((d) => d.id === docId);
        if (!doc) continue;

        // Apply filters
        if (filters?.sections && !filters.sections.includes(doc.section)) {
          continue;
        }

        // Calculate TF-IDF score
        const tf = this.calculateTF(token, doc.tokens);
        const tfidf = tf * idf;

        // Accumulate score
        const currentScore = scores.get(docId) || 0;
        scores.set(docId, currentScore + tfidf);
      }
    }

    // Convert scores to results
    const results: SearchResult[] = [];

    for (const [docId, score] of scores.entries()) {
      const doc = this.index.documents.find((d) => d.id === docId);
      if (!doc) continue;

      // Find matches in content
      const matches = this.findMatches(doc, queryTokens);

      results.push({
        document: {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          section: doc.section,
          path: doc.path,
          metadata: {
            wordCount: doc.metadata.wordCount,
            headings: doc.metadata.headings,
            tags: doc.metadata.tags,
          },
        },
        score,
        matches,
      });
    }

    // Sort by score (descending) and return top results
    const sortedResults = results.sort((a, b) => b.score - a.score).slice(0, 20);

    const endTime = performance.now();
    const searchTime = endTime - startTime;

    // Log performance warning if search is slow
    if (searchTime > 200) {
      console.warn(`[SearchEngine] Slow search: ${searchTime.toFixed(2)}ms for query "${query}"`);
    }

    // Cache results
    this.resultCache.set(cacheKey, {
      results: sortedResults,
      timestamp: Date.now(),
    });

    // Clean old cache entries (keep cache size manageable)
    if (this.resultCache.size > 100) {
      const oldestKey = Array.from(this.resultCache.keys())[0];
      this.resultCache.delete(oldestKey);
    }

    return sortedResults;
  }

  /**
   * Find text matches in document
   */
  private findMatches(doc: IndexedDocument, queryTokens: string[]): TextMatch[] {
    const matches: TextMatch[] = [];
    const content = doc.content.toLowerCase();

    for (const token of queryTokens) {
      let index = 0;
      while ((index = content.indexOf(token, index)) !== -1) {
        // Extract context (±50 characters)
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + token.length + 50);
        const context = doc.content.substring(start, end);

        matches.push({
          text: token,
          start: index,
          end: index + token.length,
          context: (start > 0 ? '...' : '') + context + (end < content.length ? '...' : ''),
        });

        index += token.length;

        // Limit matches per token
        if (matches.length >= 3) break;
      }
    }

    return matches;
  }

  /**
   * Highlight matching text in content
   */
  highlightMatches(text: string, query: string): string {
    if (!query) return text;

    const tokens = this.tokenize(query);
    let highlighted = text;

    for (const token of tokens) {
      // Case-insensitive replacement with highlight
      const regex = new RegExp(`(${token})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }

    return highlighted;
  }

  /**
   * Get index metadata
   */
  getMetadata(): IndexMetadata {
    return this.index.metadata;
  }

  /**
   * Get the full index (for deepcontext MCP integration)
   */
  getIndex(): SearchIndex {
    return this.index;
  }
}

// Singleton instance
export const searchEngine = new SearchEngine();
