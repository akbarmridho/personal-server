import os
import json
import gc
from pathlib import Path
from chonkie import SemanticChunker, Chunk
from chonkie import SentenceTransformerEmbeddings
from sentence_transformers import SentenceTransformer

os.environ["ORT_DISABLE_COREML"] = "1"
os.environ["ORT_DISABLE_MIGRAPHX"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

INPUT_CORP = Path("old-format/corporate")
INPUT_HEAD = Path("old-format/headlines")
OUTPUT = Path("dataset.json")

class CustomEmbeddings(SentenceTransformerEmbeddings):
    def embed(self, text: str):
        """Embed a single text using the sentence-transformers model."""
        return self.model.encode(text, convert_to_numpy=True, batch_size=2)

    def embed_batch(self, texts: list[str]):
        """Embed multiple texts using the sentence-transformers model."""
        return self.model.encode(texts, convert_to_numpy=True, batch_size=2)  # type: ignore



chunker = SemanticChunker(
    embedding_model=CustomEmbeddings(
        model=SentenceTransformer(
            "BAAI/bge-m3",
            backend="torch",
        ),
    ),
    threshold=0.7,
    chunk_size=512,
    similarity_window=3,
    skip_window=0,
    delim=["\n", "\r\n"]
)

# ----------------------------------------------------------
# Start streaming JSON array output
# ----------------------------------------------------------
with OUTPUT.open("w", encoding="utf-8") as dataset:
    dataset.write("[\n")
    first = True

    # ----------------------------------------------------------
    # Process CORPORATE markdown files
    # ----------------------------------------------------------
    files = sorted([f for f in INPUT_CORP.iterdir() if f.suffix == ".md"])
    total = len(files)

    for i, filepath in enumerate(files):
        out_cache = filepath.with_suffix(".json")
        date = filepath.stem

        # ----------------------------------------------------------
        # If cached → stream from cache, no chunking needed
        # ----------------------------------------------------------
        if out_cache.exists():
            with out_cache.open("r", encoding="utf-8") as f:
                cached = json.load(f)

            for chunk in cached:
                if not first:
                    dataset.write(",\n")
                first = False
                json.dump({
                    "date": date,
                    "content": chunk["content"]
                }, dataset, ensure_ascii=False)

            continue

        # ----------------------------------------------------------
        # Chunk new file
        # ----------------------------------------------------------
        with filepath.open("r", encoding="utf-8") as f:
            text = f.read()

        retries = 0
        while True:
            try:
                chunks = chunker.chunk(text)
                break
            except KeyboardInterrupt:
                print("Interrupted. Aborting.")
                raise
            except Exception:
                retries += 1
                print(f"fail on {filepath.name}, retry {retries}/5 ...")
                if retries >= 5:
                    print(f"Skipping {filepath.name}")
                    chunks = []
                    break

        # free file text ASAP
        del text
        gc.collect()

        # ----------------------------------------------------------
        # Save to cache + stream to dataset
        # ----------------------------------------------------------
        cache_list = []

        for chunk in chunks:
            out = {
                "date": date,
                "content": chunk.text
            }
            cache_list.append(out)

            if not first:
                dataset.write(",\n")
            first = False
            json.dump(out, dataset, ensure_ascii=False)

        # write cache
        with out_cache.open("w", encoding="utf-8") as f:
            json.dump(cache_list, f, ensure_ascii=False, indent=2)

        # cleanup
        del cache_list
        del chunks
        gc.collect()

        print(f"processed {i+1} / {total}: {filepath.name}")

    # ----------------------------------------------------------
    # Process HEADLINES directory
    # ----------------------------------------------------------
    for filepath in sorted(INPUT_HEAD.iterdir()):
        if not filepath.is_file():
            continue

        date = filepath.stem

        with filepath.open("r", encoding="utf-8") as f:
            content = f.read()

        if not first:
            dataset.write(",\n")
        first = False

        json.dump({
            "date": date,
            "content": content
        }, dataset, ensure_ascii=False)

        del content
        gc.collect()

    # ----------------------------------------------------------
    # Close JSON array
    # ----------------------------------------------------------
    dataset.write("\n]\n")

print("Done.")
