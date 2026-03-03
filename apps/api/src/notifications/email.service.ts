import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: false,
      ignoreTLS: true,
    });
  }

  async sendWarrantyExpiryAlert(opts: {
    to: string;
    productName: string;
    warrantyType: string;
    daysLeft: number;
    expiryDate: Date;
  }) {
    const { to, productName, warrantyType, daysLeft, expiryDate } = opts;
    const subject = `Warranty expiring in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}: ${productName}`;
    const text = [
      `Your ${warrantyType} warranty for ${productName} expires on ${expiryDate.toDateString()}.`,
      `That is ${daysLeft} day${daysLeft !== 1 ? 's' : ''} from now.`,
      '',
      'Log in to FixFirst to view your warranty details and explore your statutory rights.',
    ].join('\n');

    try {
      await this.transporter.sendMail({
        from: '"FixFirst" <no-reply@fixfirst.app>',
        to,
        subject,
        text,
      });
      this.logger.log(`Sent warranty expiry alert to ${to} for ${productName}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`);
    }
  }
}
