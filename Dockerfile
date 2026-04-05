FROM node:20-slim

# Install Python3 + pip + yt-dlp for video streaming
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    openssl \
    && python3 -m pip install --break-system-packages yt-dlp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package.json ./
COPY server/package.json server/package-lock.json* server/
COPY client/package.json client/package-lock.json* client/

# Install all dependencies
RUN npm run install:all

# Copy the rest of the source code
COPY . .

# Build client + generate Prisma client
RUN cd client && npm run build
RUN cd server && npx prisma generate

# Expose the port Railway will assign
EXPOSE ${PORT:-3000}

# Run migrations and start server
CMD cd server && npx prisma migrate deploy && cd .. && npm start
