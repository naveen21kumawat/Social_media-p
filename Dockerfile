# Step 1: Use official Node.js image
FROM node:18

# Step 2: Set the working directory in the container
WORKDIR /app

# Step 3: Copy package.json and package-lock.json (if any)
COPY package*.json ./

# Step 4: Install dependencies
RUN npm install

# Step 5: Copy the rest of the project files
COPY . .

# Step 6: Expose the port your app listens on
EXPOSE 5000

# Step 7: Command to run the app
CMD ["npm", "start"]
