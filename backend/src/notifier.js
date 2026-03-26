const nodemailer = require('nodemailer');
const axios = require('axios');

async function sendEmailNotification(event) {
  if (!process.env.SMTP_HOST) return; // Skip if no config
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || 'ci-bot@example.com',
    to: process.env.ALERT_EMAIL_TO,
    subject: `❌ CI Failed: ${event.repo_name}`,
    text: `Workflow: ${event.workflow_name}\nStatus: ${event.status}\nConclusion: ${event.conclusion}\nLink: ${event.run_url}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${process.env.ALERT_EMAIL_TO}`);
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

async function sendSlackNotification(event) {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  
  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `❌ CI Failed: *${event.repo_name}*\nWorkflow: ${event.workflow_name}\nLink: ${event.run_url}`
    });
    console.log('Slack notification sent');
  } catch (err) {
    console.error('Error sending Slack notification:', err);
  }
}

async function sendTeamsNotification(event) {
  if (!process.env.TEAMS_WEBHOOK_URL) return;
  
  try {
    await axios.post(process.env.TEAMS_WEBHOOK_URL, {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "summary": `CI Failed: ${event.repo_name}`,
      "themeColor": "E81123",
      "title": `❌ CI Failed: ${event.repo_name}`,
      "sections": [{
        "facts": [
          { "name": "Workflow:", "value": event.workflow_name },
          { "name": "Status:", "value": event.status },
          { "name": "Conclusion:", "value": event.conclusion }
        ],
        "text": `[View Workflow Run](${event.run_url})`
      }]
    });
    console.log('Teams notification sent');
  } catch (err) {
    console.error('Error sending Teams notification:', err);
  }
}

async function notifyAll(event) {
  await Promise.all([
    sendEmailNotification(event),
    sendSlackNotification(event),
    sendTeamsNotification(event)
  ]);
}

module.exports = { notifyAll };
