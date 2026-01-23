import axios from 'axios';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private apiUrl = 'https://api.smtp2go.com/v3/email/send';

  constructor() {
    this.apiKey = process.env.SMTP2GO_API_KEY || '';
    this.fromEmail = process.env.SMTP2GO_FROM_EMAIL || 'noreply@collaborative-ide.com';
    this.fromName = process.env.SMTP2GO_FROM_NAME || 'Collaborative IDE';

    if (!this.apiKey) {
      console.warn('SMTP2GO_API_KEY not configured. Email service will not work.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      console.error('SMTP2GO_API_KEY not configured');
      return false;
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          api_key: this.apiKey,
          to: [options.to],
          sender: `${this.fromName} <${this.fromEmail}>`,
          subject: options.subject,
          html_body: options.html,
          text_body: options.text || this.stripHtml(options.html),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.data && response.data.data.succeeded) {
        console.log(`Email sent successfully to ${options.to}`);
        return true;
      } else {
        console.error('Failed to send email:', response.data);
        return false;
      }
    } catch (error: any) {
      console.error('Error sending email:', error.response?.data || error.message);
      return false;
    }
  }

  async sendOTPEmail(email: string, otp: string, name?: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Email Verification</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hello${name ? ` ${name}` : ''},</p>
            <p style="font-size: 16px;">Thank you for signing up! Please use the following OTP to verify your email address:</p>
            <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h2 style="color: #667eea; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h2>
            </div>
            <p style="font-size: 14px; color: #666;">This OTP will expire in 10 minutes.</p>
            <p style="font-size: 14px; color: #666;">If you didn't create an account, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} Collaborative IDE. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Collaborative IDE',
      html,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Collaborative IDE</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Collaborative IDE!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hello ${name},</p>
            <p style="font-size: 16px;">Your account has been successfully created and verified!</p>
            <p style="font-size: 16px;">You can now start collaborating on projects with your team members.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Get Started</a>
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} Collaborative IDE. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Collaborative IDE!',
      html,
    });
  }

  async sendTeamInvitationEmail(
    email: string,
    teamName: string,
    inviterName: string,
    role: string = 'member'
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Team Invitation</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hello,</p>
            <p style="font-size: 16px;"><strong>${inviterName}</strong> has invited you to join the team <strong>"${teamName}"</strong> as a <strong>${role}</strong>.</p>
            <div style="background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;"><strong>Team:</strong> ${teamName}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Role:</strong> ${role}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Invited by:</strong> ${inviterName}</p>
            </div>
            <p style="font-size: 16px;">You can now access the team and collaborate on projects.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Team</a>
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} Collaborative IDE. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `You've been invited to join "${teamName}"`,
      html,
    });
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

export const emailService = new EmailService();

