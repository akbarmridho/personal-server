FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
# build-essential for compiling some python packages if needed
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download models to avoid downloading on startup
RUN python -c "from huggingface_hub import hf_hub_download; from transformers import AutoTokenizer; \
    hf_hub_download(repo_id='gpahal/bge-m3-onnx-int8', filename='model_quantized.onnx'); \
    AutoTokenizer.from_pretrained('BAAI/bge-m3')"

# Copy application code
COPY . .

# Expose ports
EXPOSE 8000
EXPOSE 12345

# Default run command without profiling
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]