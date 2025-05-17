
# Use official Node.js LTS image based on Alpine for a small base
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Set environment to production to disable dev-only behavior
ENV NODE_ENV=production

# Copy package definition files to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies to minimize image size
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# Expose the port the Express app listens on
EXPOSE 5001

# Default command to run the application
CMD ["node", "index.js"]