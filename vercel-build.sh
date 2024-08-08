#!/bin/bash

# Update package list and install Chromium dependencies
apt-get update
apt-get install -y wget unzip

# Download and install Chromium
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
dpkg -i google-chrome-stable_current_amd64.deb || apt-get -f install -y

# Ensure the script is executable
chmod +x /usr/bin/google-chrome

# Install Node.js dependencies
npm install

# Set environment variables for Puppeteer
export AWS_REGION=us-east-1
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
