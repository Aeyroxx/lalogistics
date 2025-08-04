# Use Node.js 18 as base image
FROM node:18-alpine

# Install curl for health checks and mongo client for connectivity checks
RUN apk add --no-cache curl

# Set working directory in container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Copy and make wait script executable
COPY wait-for-mongo.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/wait-for-mongo.sh

# Create uploads directory and set permissions
RUN mkdir -p public/uploads/profile public/uploads/ids public/uploads && \
    chmod -R 755 public/uploads

# Expose the port the app runs on
EXPOSE 3000

# Create a non-root user to run the app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Start the application
CMD ["npm", "start"]
