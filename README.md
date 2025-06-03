# Node Mailer Server

This project is an Express server with Swagger documentation and a `/messages` POST endpoint to send professional notification emails to a list of recipients.

## Features
- Express server
- Swagger API documentation
- `/messages` POST endpoint for sending emails

## Usage
1. Install dependencies: `npm install`
2. Start the server: `npm start`
3. Use the Swagger UI at `/api-docs` to test the endpoint.

## Environment Variables
- Configure your email provider credentials in a `.env` file (see below).

## .env Example
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```
