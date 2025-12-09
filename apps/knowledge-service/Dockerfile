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

# Copy application code
COPY . .

# Expose ports
EXPOSE 8000
EXPOSE 12345

# Default run command without profiling
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]