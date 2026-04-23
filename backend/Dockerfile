# Use an official lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
# (We copy this first to cache the layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy the rest of the backend files
COPY . .

# Expose the API and WebSocket port
EXPOSE 5000

# Start the application using Gunicorn for production
# We use the threading worker class since eventlet is disabled
CMD ["gunicorn", "-w", "1", "--threads", "100", "-b", "0.0.0.0:5000", "app:app"]
