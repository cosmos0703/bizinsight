# Use a lightweight Node image for the build stage (optional if we already built locally, 
# but multi-stage is safer for CI/CD consistency)
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Optional: Add custom nginx config if needed for SPA routing (React Router)
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
