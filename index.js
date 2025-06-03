require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.use(bodyParser.json());

// Swagger setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Node Mailer API',
      version: '1.0.0',
      description: 'API for sending notification emails',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./index.js'],
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /messages:
 *   post:
 *     summary: Send notification emails to a list of recipients
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emails
 *               - platform
 *               - link
 *             properties:
 *               emails:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of email addresses
 *               platform:
 *                 type: string
 *                 description: Platform name
 *               link:
 *                 type: string
 *                 description: Confirmation link
 *     responses:
 *       200:
 *         description: Emails sent successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Error sending emails
 */
app.post('/messages', async (req, res) => {
  const { emails, platform, link } = req.body;
  if (!Array.isArray(emails) || !platform || !link) {
    return res.status(400).json({ error: 'Missing required fields: emails, platform, link' });
  }

  // Setup AWS SES
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
  });
  const ses = new AWS.SES();

  const mailParams = (to) => ({
    Source: process.env.SES_FROM,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: { Data: `Security Alert: Action Required on ${platform}` },
      Body: {
        Html: {
          Data: `<div style=\"font-family:sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px;\">\n      <h2 style=\"color:#3b82f6;\">Security Alert for ${platform}</h2>\n      <p>Dear user,</p>\n      <p>We detected an attempt to access your account on <b>${platform}</b>. If this was you, please confirm your data by clicking the link below. If not, we recommend changing your password immediately.</p>\n      <a href=\"${link}\" style=\"display:inline-block;margin:16px 0;padding:10px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:4px;\">Confirm Your Data</a>\n      <p>If you have any questions, contact our support team.</p>\n      <p style=\"font-size:12px;color:#888;\">This is an automated message. Please do not reply.</p>\n    </div>`
        },
        Text: {
          Data: `Dear user,\n\nWe detected an attempt to access your account on ${platform}.\nIf this was you, please confirm your data by clicking the following link: ${link}\nIf not, we recommend changing your password immediately.\n\nIf you have any questions, contact our support team.\n\nThis is an automated message. Please do not reply.`
        }
      }
    },
    ReplyToAddresses: [process.env.SES_FROM],
    // Add List-Unsubscribe header
    MessageTags: [
      {
        Name: 'List-Unsubscribe',
        Value: `<mailto:${process.env.SES_FROM}?subject=unsubscribe>`
      }
    ]
  });

  try {
    const results = await Promise.all(
      emails.map(email => {
        return ses.sendEmail(mailParams(email)).promise()
          .then(info => {
            console.log(`SES response for ${email}:`, info.MessageId);
            return { info };
          })
          .catch(error => {
            console.error(`SES error for ${email}:`, error);
            return { error };
          });
      })
    );
    console.log('All SES responses:', results);
    res.json({ message: 'Emails sent successfully', count: results.length, results });
  } catch (error) {
    console.error('Error sending email with SES:', error);
    res.status(500).json({ error: 'Failed to send emails', details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});
