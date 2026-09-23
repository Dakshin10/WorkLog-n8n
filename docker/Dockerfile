FROM n8nio/n8n:latest

USER root
# Install custom Node modules globally for n8n Code nodes
RUN npm install -g jsonwebtoken jwks-rsa date-fns date-fns-tz uuid

USER node
