import "server-only";
import { db } from "@/lib/db";
import { sendTemplatedEmail, TemplateVars } from "@/lib/mailer";

/** Creates an in-app notification and, when a matching email template exists, sends an email too. */
export async function notifyUser(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  emailTemplateKey?: string;
  emailVars?: TemplateVars;
}) {
  await db.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
    },
  });

  if (params.emailTemplateKey) {
    const user = await db.user.findUnique({ where: { id: params.userId } });
    if (user) {
      await sendTemplatedEmail({
        to: user.email,
        templateKey: params.emailTemplateKey,
        vars: { user_name: user.fullName, ...params.emailVars },
      }).catch((err) => console.error("[notify] email send failed", err));
    }
  }
}
