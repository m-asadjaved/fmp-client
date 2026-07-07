# Use a lightweight, stable Python base image
FROM python:3.14-slim

# Install system dependencies (FFmpeg and comprehensive headless graphics stack)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgles2 \
    libgl1 \
    libegl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set up the working directory inside the container
WORKDIR /var/task

# Copy only requirements first to leverage Docker caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy your actual script and the MediaPipe asset into the image
COPY editor_engine.py .
COPY face_landmarker.task /var/task/face_landmarker.task

# Set the entry point to run your main script
CMD ["python", "editor_engine.py"]