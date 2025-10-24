# Email Template Configuration

To customize the invitation email sent to new users, follow these steps:

## Configure Email Template in Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Select **Invite user** template
4. Replace the content with the template below

## Email Template

### Subject
```
You've been invited to join Hefer Projects Management System
```

### Email Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Hefer Projects</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Hefer Projects</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      You've been invited to join the <strong>Hefer Projects Management System</strong>. This platform will help you manage projects, drawings, photos, tasks, and collaborate with your team.
    </p>

    <p style="font-size: 16px; margin-bottom: 30px;">
      Click the button below to set your password and get started:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}"
         style="background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
        Accept Invitation & Set Password
      </a>
    </div>

    <div style="background: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #1e40af; font-size: 18px;">Getting Started</h3>

      <h4 style="color: #1e40af; font-size: 16px; margin-top: 20px;">🖥️ Desktop/Web Browser</h4>
      <ol style="margin: 10px 0; padding-left: 20px;">
        <li>Visit the application URL in your web browser (Chrome, Firefox, Safari, or Edge recommended)</li>
        <li>Click the button above to set your password</li>
        <li>For quick access, bookmark the page or add it to your browser favorites</li>
        <li><strong>Install as App:</strong> Many browsers allow you to "Install" the app for a native app-like experience:
          <ul style="margin-top: 8px;">
            <li><strong>Chrome/Edge:</strong> Click the install icon in the address bar or menu → "Install Hefer Projects"</li>
            <li><strong>Safari:</strong> File → Add to Dock</li>
          </ul>
        </li>
      </ol>

      <h4 style="color: #1e40af; font-size: 16px; margin-top: 20px;">📱 Mobile Devices (iOS/Android)</h4>
      <ol style="margin: 10px 0; padding-left: 20px;">
        <li>Open this email on your mobile device</li>
        <li>Tap the invitation button above</li>
        <li>Set your password and log in</li>
        <li><strong>Add to Home Screen:</strong>
          <ul style="margin-top: 8px;">
            <li><strong>iOS (Safari):</strong> Tap the Share icon → "Add to Home Screen"</li>
            <li><strong>Android (Chrome):</strong> Tap menu (⋮) → "Add to Home Screen" or "Install App"</li>
          </ul>
        </li>
        <li>The app icon will appear on your home screen like a native app</li>
        <li>You can now access it offline and get a full-screen experience</li>
      </ol>
    </div>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>⚠️ Security Note:</strong> This invitation link will expire in 24 hours. If it expires, please contact your administrator for a new invitation.
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you have any questions or need assistance, please contact your system administrator.
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      Best regards,<br>
      <strong>Hefer Projects Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all;">{{ .ConfirmationURL }}</p>
    <p style="margin-top: 20px;">If you didn't expect this invitation, you can safely ignore this email.</p>
  </div>
</body>
</html>
```

## Configuration Steps

1. **Update Site URL** (in Supabase Dashboard → Authentication → URL Configuration):
   - Set your production site URL (e.g., `https://your-domain.com`)
   - Add redirect URLs for both development and production

2. **Email Rate Limits** (optional):
   - Consider adjusting rate limits in Authentication → Rate Limits if you'll be inviting many users

3. **Email Provider** (optional):
   - For production, configure a custom SMTP provider (like SendGrid, AWS SES, etc.) in Authentication → Email Settings
   - This ensures better deliverability and allows custom "From" addresses

## Testing

After configuration:
1. Create a test user from the User Management module
2. Check that the invitation email is received
3. Verify that all links and instructions work correctly
4. Test the password setup flow
5. Confirm users can log in after setting their password

## Notes

- Users will receive a secure link that expires after 24 hours
- The system automatically creates a user profile when they accept the invitation
- Once they set their password, they can log in immediately
- Administrators can resend invitations if needed from the User Management module
