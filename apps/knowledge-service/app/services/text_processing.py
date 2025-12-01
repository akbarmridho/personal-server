from chonkie import TokenChunker
from chonkie.tokenizer import TokenizerProtocol
from chonkie.types import Chunk

class TextProcessor:
    def __init__(self, chunk_size: int = 512, overlap: int = 64, tokenizer: str | TokenizerProtocol = "gpt2"):
        self.chunker: TokenChunker = TokenChunker(
            tokenizer=tokenizer,
            chunk_size=chunk_size, 
            chunk_overlap=overlap,
        )

    def chunk_texts(self, texts: list[str]) -> list[list[str]]:
        """
        Chunk text into segments of specified token size.
        """
        document_chunks: list[list[Chunk]] = self.chunker.chunk_batch(texts, 20, False)
        # chonkie returns Chunk objects usually, we need text
        return [[chunk.text for chunk in chunks] for chunks in document_chunks]
