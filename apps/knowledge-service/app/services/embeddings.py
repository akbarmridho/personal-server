import asyncio
import os
import gc
import numpy as np
import onnxruntime as ort
from concurrent.futures import ThreadPoolExecutor
from typing import Any, List, Dict
from collections import defaultdict
from huggingface_hub import hf_hub_download
from transformers import AutoTokenizer
from openrouter import OpenRouter
from app.core.config import settings
from qdrant_client.models import SparseVector

def dict_to_sparse_vector(d: Dict[str, float]) -> SparseVector:
    return SparseVector(
        indices=list(d.keys()),
        values=list(d.values())
    )

# ---------------------------------------------------------
# HELPER: Optimized ONNX Runner for Low Memory (4GB Limit)
# ---------------------------------------------------------
class BGEM3OnnxRunner:
    """
    A lightweight, memory-safe replacement for FlagEmbedding using ONNX Runtime (Int8).
    Optimized for running on CPU with strict RAM constraints.
    """
    def __init__(self):
        print("Downloading/Loading Int8 Quantized BGE-M3 model...")
        model_path = hf_hub_download(repo_id="gpahal/bge-m3-onnx-int8", filename="model_quantized.onnx")
        
        # CPUExecutionProvider is safer for low RAM than CUDA
        # inter_op_num_threads=1 helps prevent CPU contention with other async tasks
        sess_options = ort.SessionOptions()
        sess_options.intra_op_num_threads = 2
        sess_options.inter_op_num_threads = 1
        sess_options.enable_cpu_mem_arena = False
        
        self.session = ort.InferenceSession(
            model_path, 
            sess_options=sess_options, 
            providers=['CPUExecutionProvider']
        )

        self.tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-m3")
        
        # Tokens to ignore in sparse weights (CLS, EOS, PAD, UNK)
        self.unused_tokens = {
            self.tokenizer.cls_token_id, 
            self.tokenizer.eos_token_id, 
            self.tokenizer.pad_token_id, 
            self.tokenizer.unk_token_id
        }
        print("BGE-M3 ONNX Model loaded successfully.")

    def encode(self, sentences: List[str], batch_size: int = 2, max_length: int = 512) -> Dict[str, List[Any]]:
        """
        Generates Sparse and Late Interaction (ColBERT) embeddings.
        NOTE: Discards Dense vectors immediately to save RAM.
        """
        all_sparse = []
        all_colbert = []
        
        # Sort sentences by length to minimize padding overhead (Crucial for CPU speed)
        # We store original indices to restore order later
        sorted_indices = np.argsort([len(s) for s in sentences])[::-1]
        
        for i in range(0, len(sentences), batch_size):
            batch_idx = sorted_indices[i : i + batch_size]
            batch_text = [sentences[idx] for idx in batch_idx]
            
            # Tokenize -> Numpy
            encoded = self.tokenizer(
                batch_text,
                padding=True,
                truncation=True,
                max_length=max_length,
                return_tensors="np" 
            )
            
            inputs = {
                "input_ids": encoded["input_ids"].astype(np.int64),
                "attention_mask": encoded["attention_mask"].astype(np.int64)
            }
            
            # Run Inference
            # Outputs: [0]=Dense, [1]=Sparse, [2]=ColBERT
            outputs = self.session.run(None, inputs)
            
            # We ignore outputs[0] (Dense) because you use OpenRouter for that.
            # This saves significant RAM by not appending heavy float32 arrays to a list.
            
            raw_sparse_vecs = outputs[1]
            raw_colbert_vecs = outputs[2]
            
            # --- PROCESS COLBERT (LATE) ---
            for j, mask in enumerate(encoded["attention_mask"]):
                # Slice off padding to save RAM (ColBERT is storage heavy)
                valid_len = np.sum(mask)
                colbert_emb = raw_colbert_vecs[j][:valid_len]
                all_colbert.append(colbert_emb)

            # --- PROCESS SPARSE ---
            for j, input_ids in enumerate(encoded["input_ids"]):
                weights = raw_sparse_vecs[j].squeeze(-1)
                sparse_dict = defaultdict(float)
                
                for token_id, weight in zip(input_ids, weights):
                    if weight > 0 and token_id not in self.unused_tokens:
                        sparse_dict[str(token_id)] = max(sparse_dict[str(token_id)], float(weight))
                
                all_sparse.append(dict(sparse_dict))
            
            # Clear memory after processing this batch
            del inputs, encoded, outputs, raw_sparse_vecs, raw_colbert_vecs
                
        # Restore original order
        results = {
            "sparse": [None] * len(sentences),
            "colbert": [None] * len(sentences)
        }
        
        for i, original_idx in enumerate(sorted_indices):
            results["sparse"][original_idx] = all_sparse[i]
            results["colbert"][original_idx] = all_colbert[i]
        
        # Cleanup temporary arrays
        del all_sparse, all_colbert, sorted_indices
        gc.collect()
            
        return results

# ---------------------------------------------------------
# MAIN SERVICE
# ---------------------------------------------------------

class EmbeddingService:
    DENSE_MODEL: str = "qwen/qwen3-embedding-8b"
    DENSE_DIMENSION: int = 1024
    BGE_M3_LENGTH: int = 2048
    BGE_M3_COLBERT_DIMENSION: int = 1024
    
    # Typed as the custom runner now
    bge_m3_model: BGEM3OnnxRunner 
    openrouter_client: OpenRouter

    def __init__(self):
        # Initialize models
        print("Loading Embedding Service...")

        # Initialize the Optimized ONNX Runner
        self.bge_m3_model = BGEM3OnnxRunner()
        
        # Semaphore to allow controlled concurrent ONNX inference
        # max_workers=1 in executor + semaphore=1 = sequential (safe for low RAM)
        # Increase semaphore if you have more RAM and want parallel processing
        self.m3_semaphore = asyncio.Semaphore(1)
        
        # Configurable batch size for ONNX
        self.m3_batch_size = int(os.getenv("BGE_M3_BATCH_SIZE", 2))

        # Dense (OpenRouter with Qwen)
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is required.")

        self.openrouter_client = OpenRouter(api_key=settings.OPENROUTER_API_KEY)

        # ThreadPoolExecutor for M3
        # max_workers=1 is strictly necessary to prevent RAM spikes from concurrent ONNX runs
        self.executor = ThreadPoolExecutor(max_workers=1)

        print("Models loaded.")

    # ---------------------------
    # DENSE (ASYNC, OPENROUTER)
    # ---------------------------
    async def _embed_dense(self, texts: List[str], is_query: bool = False) -> List[List[float]]:
        BATCH_SIZE = 50
        all_embeddings = []

        def generate_task(text: str) -> str:
            # Qwen-specific instruction
            return f"Instruct: Given a search query, retrieve relevant passages that answer the query\nQuery: {text}"

        if is_query:
            texts = [generate_task(t) for t in texts]

        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i:i + BATCH_SIZE]

            # Ensure robust error handling for API calls
            try:
                result = await self.openrouter_client.embeddings.generate_async(
                    model=self.DENSE_MODEL,
                    input=batch,
                    encoding_format="float",
                    dimensions=self.DENSE_DIMENSION,
                    retries=3
                )
                all_embeddings.extend([e.embedding for e in result.data])
            except Exception as e:
                print(f"Error fetching dense embeddings: {e}")
                raise e

        return all_embeddings

    async def _embed_m3(self, texts: List[str]) -> List[Dict[str, Any]]:
        """
        BGE-M3 encode via ONNX.
        Runs in a separate thread to avoid blocking the Async Event Loop.
        Uses semaphore for controlled concurrency.
        """
        async with self.m3_semaphore:
            loop = asyncio.get_running_loop()
            
            # Offload CPU-intensive ONNX work to thread pool
            output = await loop.run_in_executor(
                self.executor,
                lambda: self.bge_m3_model.encode(
                    texts,
                    batch_size=self.m3_batch_size,
                    max_length=3072 
                )
            )

        results = []
        for i in range(len(texts)):
            late = output["colbert"][i]

            if len(late) > 900:
                # we have to trim colbert multivector on long tokens since qdrant have total vector hard limit
                # of 1,048,576 vector items
                late = late[:900]

            results.append({
                "sparse": dict_to_sparse_vector(output["sparse"][i]),
                "late": late
            })
        
        # Free memory after processing
        del output
        gc.collect()

        return results

    # ---------------------------
    # QUERY EMBEDDING
    # ---------------------------
    async def embed_query(self, text: str) -> Dict[str, Any]:
        dense_task = self._embed_dense([text], is_query=True)
        m3_task = self._embed_m3([text])

        dense, m3 = await asyncio.gather(dense_task, m3_task)

        return {
            "dense": dense[0],
            "late": m3[0]["late"],
            "sparse": m3[0]["sparse"]
        }

    # ---------------------------
    # DOCUMENT EMBEDDING
    # ---------------------------
    async def embed_documents(self, texts: List[str], batch_size: int = 20) -> List[Dict[str, Any]]:
        """
        Embeds documents in chunks.
        Note: The batch_size here controls how many docs are sent to OpenRouter/ONNX at once.
        """
        results = []

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]

            dense_task = self._embed_dense(batch_texts, is_query=False)
            m3_task = self._embed_m3(batch_texts)

            dense, m3 = await asyncio.gather(dense_task, m3_task)

            for j in range(len(batch_texts)):
                results.append({
                    "dense": dense[j],
                    "late": m3[j]["late"],
                    "sparse": m3[j]["sparse"]
                })

        return results