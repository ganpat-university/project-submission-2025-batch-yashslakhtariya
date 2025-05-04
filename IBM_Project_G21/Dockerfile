# Use a node image as the base
FROM node:23

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Angular app
RUN npm run build --prod

# Install serve to serve the static files
RUN npm install -g serve

# Serve the built Angular app
CMD ["serve", "-s", "dist/rapidlekh/browser/", "-l", "6432"]

# Expose the port the app runs on
EXPOSE 6432