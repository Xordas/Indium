# Indium

Indium is a high-performance web proxy with built-in apps and games, designed for secure and private browsing.

## Key Features

- **Secure Proxy**: Privacy-focused browsing with no PII logging
- **Apps & Games**: Built-in collection of web applications and games
- **AI Assistant**: Integrated AI to help users qith any questions
- **Customizable**: Adjustable settings to personalize user experience

## Quick Start

```bash
# Clone the repository
git clone https://github.com/xordas/indium.git
cd indium

# Set up environment (copy example and edit as needed)
cp .example.env .env # Linux  
Copy-Item .example.env -Destination .env # Windows PowerShell  
copy .example.env .env # Windows CMD  

# Install dependencies
npm install

# Development mode
node main.js

# Production mode
npm install -g pm2
pm2 start main.js --name "indium" --watch

# Access the application
# Open http://localhost:8080 in your browser
```

## Tech Stack
Node.js, Express, Ultraviolet, Bare Server, JavaScript

## License
Indium is licened under the AGPL 3.0 license, see license file for more.