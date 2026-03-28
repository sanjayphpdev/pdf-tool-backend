# Use official Node image
FROM node:18-slim

# Install qpdf
RUN apt-get update && \
    apt-get install -y qpdf && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create uploads folder
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]