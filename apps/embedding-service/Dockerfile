FROM python:3.12-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
# Install dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir -r requirements.txt
# Copy the embedding service
COPY embedding.py .
# Expose port
EXPOSE 8000
# Run the service
CMD ["uvicorn", "embedding:app", "--host", "0.0.0.0", "--port", "8000"]