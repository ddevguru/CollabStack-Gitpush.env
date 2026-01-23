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
  private emailProvider: 'smtp' | 'resend' | 'smtp2go' | 'emailjs' | 'console';

  constructor() {
    // Priority: SMTP (username/password) > Resend > EmailJS
    this.fromEmail = process.env.SMTP_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || process.env.SMTP2GO_FROM_EMAIL || 'noreply@collaborative-ide.com';
    this.fromName = process.env.SMTP_FROM_NAME || process.env.RESEND_FROM_NAME || process.env.SMTP2GO_FROM_NAME || 'Collaborative IDE';
    
    // Determine provider - SMTP with username/password has highest priority
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.emailProvider = 'smtp';
      this.apiKey = 'smtp'; // Dummy value
      console.log('📧 Email Service: Using SMTP (username/password)');
      console.log(`📧 SMTP Host: ${process.env.SMTP_HOST}`);
      console.log(`📧 From: ${this.fromEmail}`);
    } else if (process.env.RESEND_API_KEY) {
      this.emailProvider = 'resend';
      this.apiKey = process.env.RESEND_API_KEY;
      console.log('📧 Email Service: Using Resend');
    } else if (process.env.EMAILJS_PUBLIC_KEY) {
      this.emailProvider = 'emailjs';
      this.apiKey = process.env.EMAILJS_PUBLIC_KEY;
      console.log('📧 Email Service: Using EmailJS');
    } else {
      // If no email service configured, show error
      this.emailProvider = 'console';
      this.apiKey = '';
      console.error('❌ No email service configured!');
      console.error('📧 Please configure SMTP in .env file:');
      console.error('   SMTP_HOST=smtp.gmail.com');
      console.error('   SMTP_PORT=587');
      console.error('   SMTP_USER=your-email@gmail.com');
      console.error('   SMTP_PASS=your-app-password');
      console.error('   SMTP_FROM_EMAIL=your-email@gmail.com');
      console.error('   SMTP_FROM_NAME=Collaborative IDE');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (this.emailProvider === 'smtp') {
      return this.sendViaSMTP(options);
    } else if (this.emailProvider === 'resend') {
      return this.sendViaResend(options);
    } else if (this.emailProvider === 'emailjs') {
      return this.sendViaEmailJS(options);
    } else if (this.emailProvider === 'smtp2go') {
      return this.sendViaSMTP2GO(options);
    } else {
      // Console mode - only if no email service configured
      console.error('❌ No email service configured. Email not sent.');
      return this.sendViaConsole(options);
    }
  }

  private async sendViaConsole(options: EmailOptions): Promise<boolean> {
    // Extract OTP from HTML for easy testing
    const otpMatch = options.html.match(/>(\d{6})</);
    const otp = otpMatch ? otpMatch[1] : 'N/A';
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📧 EMAIL (CONSOLE MODE - No Email Service Configured)');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`🔑 OTP CODE: ${otp}`);
    console.log('───────────────────────────────────────────────────────');
    console.log('Email Content:');
    console.log(this.stripHtml(options.html));
    console.log('═══════════════════════════════════════════════════════\n');
    
    return true; // Always return true in console mode - don't fail registration
  }

  private async sendViaSMTP(options: EmailOptions): Promise<boolean> {
    try {
      const smtpConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
        },
      };

      if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
        console.error('❌ SMTP_USER and SMTP_PASS are required');
        return false;
      }

      // Use nodemailer
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: smtpConfig.auth,
        tls: smtpConfig.tls,
      });

      // Verify connection
      try {
        await transporter.verify();
        console.log('✅ SMTP connection verified');
      } catch (verifyError: any) {
        console.error('❌ SMTP connection failed:', verifyError.message);
        console.error('💡 Check your SMTP credentials and settings');
        return false;
      }

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${options.to} via SMTP`);
      console.log(`📧 Message ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('❌ Error sending email via SMTP:', error.message);
      if (error.code === 'EAUTH') {
        console.error('💡 Authentication failed. Check your SMTP_USER and SMTP_PASS');
        console.error('💡 For Gmail, use App Password instead of regular password');
      } else if (error.code === 'ECONNECTION') {
        console.error('💡 Connection failed. Check SMTP_HOST and SMTP_PORT');
      }
      // Fallback to console mode instead of failing
      console.warn('📧 Falling back to console mode...');
      return this.sendViaConsole(options);
    }
  }

  private async sendViaResend(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      console.error('❌ RESEND_API_KEY not configured');
      return false;
    }

    try {
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text || this.stripHtml(options.html),
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.id) {
        console.log(`✅ Email sent successfully to ${options.to} via Resend`);
        return true;
      } else {
        console.error('❌ Failed to send email via Resend:', response.data);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error sending email via Resend:', error.response?.data || error.message);
      return false;
    }
  }

  private async sendViaSMTP2GO(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      console.error('❌ SMTP2GO_API_KEY not configured');
      return false;
    }

    try {
      const response = await axios.post(
        'https://api.smtp2go.com/v3/email/send',
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

      if (response.data && response.data.data) {
        if (response.data.data.succeeded > 0) {
          console.log(`✅ Email sent successfully to ${options.to}`);
          return true;
        } else {
          const errorMsg = response.data.data.failures?.[0] || 'Unknown error';
          console.error(`❌ Failed to send email to ${options.to}:`, errorMsg);
          return false;
        }
      } else {
        console.error('❌ Failed to send email: Invalid response', response.data);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error sending email:', error.response?.data || error.message);
      return false;
    }
  }

  // EmailJS - Completely free, no domain verification needed
  private async sendViaEmailJS(options: EmailOptions): Promise<boolean> {
    const serviceId = process.env.EMAILJS_SERVICE_ID || 'default_service';
    const templateId = process.env.EMAILJS_TEMPLATE_ID || 'template_otp';

    try {
      // EmailJS uses a different approach - we'll use their API directly
      const response = await axios.post(
        `https://api.emailjs.com/api/v1.0/email/send`,
        {
          service_id: serviceId,
          template_id: templateId,
          user_id: this.apiKey, // EmailJS uses user_id instead of api_key
          template_params: {
            to_email: options.to,
            to_name: options.to.split('@')[0],
            from_name: this.fromName,
            subject: options.subject,
            message_html: options.html,
            message_text: options.text || this.stripHtml(options.html),
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        console.log(`✅ Email sent successfully to ${options.to} via EmailJS`);
        return true;
      } else {
        console.error('❌ Failed to send email via EmailJS:', response.data);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error sending email via EmailJS:', error.response?.data || error.message);
      // Don't fail completely - EmailJS might need setup
      console.warn('💡 EmailJS Setup: https://www.emailjs.com/docs/');
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

  async sendPasswordResetOTP(email: string, otp: string, name?: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Password Reset</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hello${name ? ` ${name}` : ''},</p>
            <p style="font-size: 16px;">We received a request to reset your password. Use the following OTP to reset your password:</p>
            <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h2 style="color: #667eea; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h2>
            </div>
            <p style="font-size: 14px; color: #666;">This OTP will expire in 10 minutes.</p>
            <p style="font-size: 14px; color: #666;">If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} Collaborative IDE. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Collaborative IDE',
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

