# Stage 1: Build React Frontend
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Setup Python Backend
FROM python:3.11-slim
WORKDIR /app

# Copy built frontend from Stage 1
COPY --from=build /app/dist /app/dist

# Setup Backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend

# Set Env to ensure Python finds the static folder correctly relative to main.py
# current workdir is /app. main.py is in /app/backend/main.py.
# If we run python backend/main.py, __file__ is backend/main.py.
# dirname is backend. dirname(dirname) is /app.
# /app/dist exists. Logic holds.

# Expose Port (Railway uses $PORT)
ENV PORT=8000
EXPOSE 8000

# Run Command
CMD ["python", "backend/main.py"]
