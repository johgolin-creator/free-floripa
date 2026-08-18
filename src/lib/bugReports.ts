import { supabase } from "./supabase";

export const bugReportsEnabled = Boolean(supabase);

export interface SubmitBugReportInput {
  reporterId: string;
  reporterEmail: string;
  reporterName: string;
  title: string;
  description: string;
  pagePath: string;
}

export async function submitBugReport(input: SubmitBugReportInput) {
  if (!supabase) return;

  const { error } = await supabase.from("bug_reports").insert({
    reporter_id: input.reporterId,
    reporter_email: input.reporterEmail,
    reporter_name: input.reporterName,
    title: input.title,
    description: input.description,
    page_path: input.pagePath,
    status: "Aberto"
  });

  if (error) throw new Error(error.message);
}
