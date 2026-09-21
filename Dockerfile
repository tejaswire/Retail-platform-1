# Use a small, current Node LTS base image
FROM node:20-alpine

# Create app directory inside the container
WORKDIR /usr/src/app

# Copy dependency manifests first (better layer caching)
COPY app/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the rest of the application source
COPY app/ ./

# Run as a non-root user (alpine node images ship a built-in 'node' user)
USER node

# Configure the port via env var — matches your process.env.PORT || 3000 logic
ENV PORT=8081
EXPOSE 8081

# Docker-level health check hitting your /health endpoint
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8081/health || exit 1

CMD ["npm", "start"]