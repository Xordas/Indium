# Indium

Indium is a high-performance, privacy-focused web proxy designed to provide secure and unrestricted internet access. Featuring an integrated collection of apps and games, Indium combines entertainment with powerful web browsing capabilities in a single platform.

## Features

- **Secure Browsing**: Advanced web proxy technology that keeps your browsing activity private
- **Multi-Protocol Support**: Compatible with multiple proxy methods (Ultraviolet, Epoxy, BARE)
- **Built-in Apps & Games**: Extensive collection of pre-configured web applications and games
- **Privacy-Focused**: No personally identifiable information (PII) is stored
- **Customizable Settings**: Fine-tune your browsing experience to your preferences
- **High Performance**: Utilizes multi-core processing and advanced caching for speed
- **AI Assistant Integration**: Built-in AI helper for enhanced user experience

## Privacy Commitment

Indium takes your privacy seriously:

- **Zero PII Logging**: Our logs never contain personally identifiable information
- **Privacy-Enhanced Requests**: Web requests are processed through secure proxies
- **No IP Tracking**: User IP addresses are not stored or tracked
- **Content Security**: Advanced headers protect against common web vulnerabilities
- **Open Source**: All code can be audited for security compliance

## Technical Stack

- **Backend**: Node.js with Express
- **Performance**: Multi-threaded architecture using Node.js clusters
- **Caching**: Efficient memory caching with configurable TTLs
- **Security**: Comprehensive security headers and request sanitization
- **Logging**: Structured, privacy-focused logging with pino

## Quick Start

```bash
# Clone the repository
git clone https://github.com/xordas/indium.git
cd indium

# Install dependencies
npm install

# Start the server
node main.js

# For production environments
npm install -g pm2
pm2 start main.js --name "indium"