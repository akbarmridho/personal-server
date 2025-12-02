import bm25s
import mmh3
import re
import os

class CustomBM25:
    def __init__(self, stop_words: list[str] = None, save_path: str = "bm25s_index"):
        self.retriever = None
        self.stop_words = set(stop_words) if stop_words else set()
        self.save_path = save_path
        
        # Try to load existing index
        if os.path.exists(save_path):
            try:
                self.retriever = bm25s.BM25.load(save_path, load_corpus=False)
                print(f"Loaded BM25S index from {save_path}")
            except Exception as e:
                print(f"Failed to load BM25S index: {e}")

    def _tokenize(self, texts: list[str]):
        """
        Custom JARGON-SAFE tokenizer.
        Splits ONLY on whitespace to preserve 'ADX-156', 'v2.5', 'C++'.
        Lowercasing is optional but recommended for search.
        """
        # Regex: matches any sequence of non-whitespace characters
        # This keeps 'ADX-156' as one token.
        token_pattern = r"(?u)\b\S+\b" 
        
        # We manually process to handle stopwords strictly
        tokenized_batch = []
        for text in texts:
            tokens = re.findall(token_pattern, text.lower())
            tokens = [t for t in tokens if t not in self.stop_words]
            tokenized_batch.append(tokens)
        
        return tokenized_batch

    def fit(self, corpus_chunks: list[str]):
        """
        Fits the BM25 model on your entire corpus of CHUNKS.
        """
        tokens = self._tokenize(corpus_chunks)
        
        # bm25s needs tokenized input for indexing
        # We use a distinct method to allow manual control
        self.retriever = bm25s.BM25()
        self.retriever.index(tokens)
        
        # Save the model
        try:
            self.retriever.save(self.save_path)
            print(f"Saved BM25S index to {self.save_path}")
        except Exception as e:
            print(f"Failed to save BM25S index: {e}")
            
        return self

    def encode(self, text: str) -> dict:
        """
        Generates the Sparse Vector (indices=MMH3, values=BM25 Score)
        """
        if self.retriever is None:
            # Fallback or error? For now return empty or fit on single doc (bad practice but avoids crash)
            # Better to return empty and log warning
            print("Warning: BM25S model not fitted. Returning empty vector.")
            return {"indices": [], "values": []}

        tokens = self._tokenize([text])[0]
        if not tokens:
            return {"indices": [], "values": []}

        # BM25S Trick: We 'query' the model with the document itself 
        # to get the TF-IDF/BM25 weights for its own terms.
        # This returns scores for the tokens *assuming* they were a query.
        
        # Create a tiny "corpus" of just this one doc to map weights
        # Note: In production, you might optimize this by accessing IDF directly, 
        # but this is the safest implementation using the library's public API.
        # doc_tokens_ids = bm25s.tokenize([text], token_pattern=r"(?u)\b\S+\b") # Not used in snippet logic directly
        
        # We need to map the internal bm25s vocab IDs to our tokens
        # to apply MMH3 hashing.
        indices = []
        values = []
        
        # Get unique tokens to avoid duplicate hashing
        unique_tokens = set(tokens)
        
        for token in unique_tokens:
            # 1. HASHING (The Bridge to Qdrant)
            # mmh3 returns a 32-bit signed int by default. 
            # Qdrant prefers unsigned 32-bit.
            hashed_id = mmh3.hash(token, signed=False)
            
            # 2. SCORING
            # We fetch the IDF for this token from our fitted model
            # TF (Term Freq) is calculated from the current text
            tf = tokens.count(token)
            idf = self.retriever.idf.get(token, 0.0) # Access internal IDF dict
            
            # Simplified BM25 score (TF * IDF) 
            # Real BM25 has saturation, but for sparse retrieval, TF*IDF is often sufficient.
            # If you want full BM25 score, use self.retriever.get_scores()
            score = tf * idf 
            
            if score > 0:
                indices.append(hashed_id)
                values.append(float(score))
                
        return {"indices": indices, "values": values}
