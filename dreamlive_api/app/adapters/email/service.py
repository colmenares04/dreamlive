"""
Servicio de Email – adaptador de infraestructura.
Usa smtplib async-compatible para envío de emails transaccionales.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.config import settings


class EmailService:
    """Encapsula el envío de emails transaccionales via SMTP."""

    @staticmethod
    def _build_message(to: str, subject: str, html_body: str) -> MIMEMultipart:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html", "utf-8"))
        return msg

    @classmethod
    def send(cls, to: str, subject: str, html_body: str) -> bool:
        """
        Envía un email. Retorna True si fue exitoso.
        En producción se recomienda usar un worker async (Celery/ARQ).
        """
        if not settings.SMTP_USER:
            # Email no configurado – solo logear en desarrollo
            print(f"[EMAIL MOCK] To: {to} | Subject: {subject}")
            return True

        try:
            msg = cls._build_message(to, subject, html_body)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM, to, msg.as_string())
            return True
        except Exception as exc:
            print(f"[EMAIL ERROR] {exc}")
            return False

    @classmethod
    def send_password_reset(cls, to: str, token: str, base_url: str = "http://localhost:5173") -> bool:
        reset_url = f"{base_url}/reset-password?token={token}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Inter, sans-serif; background: #f1f5f9; padding: 40px;">
          <div style="max-width: 480px; margin: 0 auto; background: white;
               border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; background: #0ea5e9; border-radius: 12px;
                   padding: 12px 20px; color: white; font-weight: 900; font-size: 18px; letter-spacing: -0.5px;">
                DREAMLIVE
              </div>
            </div>
            <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 8px;">
              Restablece tu contraseña
            </h2>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 28px;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta.
              Haz clic en el botón a continuación. El enlace expira en <strong>2 horas</strong>.
            </p>
            <a href="{reset_url}"
               style="display: block; background: #0f172a; color: white; text-align: center;
                      padding: 14px 24px; border-radius: 10px; font-weight: 700;
                      font-size: 14px; text-decoration: none; margin-bottom: 24px;">
              Restablecer Contraseña
            </a>
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.6;">
              Si no solicitaste este cambio, puedes ignorar este email.
              Tu contraseña permanecerá sin cambios.<br><br>
              <a href="{reset_url}" style="color: #0ea5e9; word-break: break-all;">{reset_url}</a>
            </p>
          </div>
        </body>
        </html>
        """
        return cls.send(to, "Restablece tu contraseña – DreamLive", html)

    @classmethod
    def send_welcome(cls, to: str, username: str) -> bool:
        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Inter, sans-serif; background: #f1f5f9; padding: 40px;">
          <div style="max-width: 480px; margin: 0 auto; background: white;
               border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <h2 style="color: #1e293b;">¡Bienvenido a DreamLive, {username}!</h2>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
              Tu cuenta ha sido creada exitosamente. Un administrador la activará en breve.
            </p>
          </div>
        </body>
        </html>
        """
        return cls.send(to, f"Bienvenido a DreamLive, {username}", html)
