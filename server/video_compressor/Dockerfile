# Use a lightweight, stable Python base image
FROM python:3.12-slim

# Install only the system dependencies we actually need (FFmpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install required Python packages for main.py
RUN pip install --no-cache-dir boto3 requests

# Set up the working directory inside the container
WORKDIR /var/task

# Copy your actual script and the MediaPipe asset into the image
COPY main.py .

# Set the entry point to run your main script
CMD ["python", "main.py"]