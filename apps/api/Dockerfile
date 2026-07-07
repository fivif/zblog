FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir \
  "fastapi>=0.115.0" \
  "uvicorn>=0.34.0" \
  "sqlmodel>=0.0.22" \
  "python-multipart>=0.0.9" \
  "markdown-it-py>=3.0.0" \
  "mdit-py-plugins>=0.4.0" \
  "pygments>=2.19.0" \
  "bleach>=6.2.0" \
  "bcrypt>=4.0.0"

COPY . .

RUN mkdir -p /app/data/articles /app/data/media

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "blog_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
