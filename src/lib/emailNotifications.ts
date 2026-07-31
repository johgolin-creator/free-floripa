import { supabase } from "./supabase";

export type EmailNotificationEvent =
  | "application_status"
  | "urgent_job"
  | "chat_message"
  | "low_coins"
  | "system";

export interface EmailNotificationInput {
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  recipientName?: string | null;
  subject: string;
  preview: string;
  body: string;
  eventType: EmailNotificationEvent;
  metadata?: Record<string, unknown>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const emailNotificationsEnabled = Boolean(supabase);

function normalizeUserId(value?: string | null) {
  if (!value || !UUID_PATTERN.test(value)) return null;
  return value;
}

function normalizeEmail(value?: string | null) {
  const email = value?.trim().toLowerCase() ?? "";
  return email.includes("@") ? email : null;
}

export async function enqueueEmailNotification(input: EmailNotificationInput) {
  if (!supabase) return;

  const recipientEmail = normalizeEmail(input.recipientEmail);
  if (!recipientEmail) return;

  const { error } = await supabase.from("email_notifications").insert({
    recipient_user_id: normalizeUserId(input.recipientUserId),
    recipient_email: recipientEmail,
    recipient_name: input.recipientName?.trim() || null,
    subject: input.subject,
    preview: input.preview,
    body: input.body,
    event_type: input.eventType,
    metadata: input.metadata ?? {}
  });

  if (error) throw new Error(error.message);
}
