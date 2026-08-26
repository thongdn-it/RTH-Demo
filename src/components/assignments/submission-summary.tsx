import { ExternalLink, FileText, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { fileNameFromPath, signSubmissionFile } from "@/lib/data/storage";
import { formatDateTime, formatScore } from "@/lib/format";
import type { Tables } from "@/lib/database.types";

/**
 * The submitted work plus its grade. Rendered on the server because the file
 * link is a signed URL that only exists for viewers RLS lets read the object.
 */
export async function SubmissionSummary({
  submission,
  showGrade = true,
}: {
  submission: Tables<"submissions">;
  showGrade?: boolean;
}) {
  const fileUrl =
    submission.submission_type === "file"
      ? await signSubmissionFile(submission.storage_path)
      : null;

  const updated = submission.updated_at !== submission.submitted_at;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        {submission.submission_type === "file" ? (
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          {submission.submission_type === "file" ? (
            fileUrl ? (
              <Button asChild variant="link" className="min-h-11 justify-start p-0 font-normal">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <span className="truncate">
                    {fileNameFromPath(submission.storage_path ?? "")}
                  </span>
                  <ExternalLink aria-hidden />
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Không mở được file đính kèm.</p>
            )
          ) : (
            <Button asChild variant="link" className="min-h-11 justify-start p-0 font-normal">
              <a
                href={submission.external_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="truncate">{submission.external_url}</span>
                <ExternalLink aria-hidden />
              </a>
            </Button>
          )}

          <p className="mt-1 text-xs text-muted-foreground">
            Nộp lúc {formatDateTime(submission.submitted_at)}
            {updated ? ` · Cập nhật ${formatDateTime(submission.updated_at)}` : ""}
          </p>
        </div>
      </div>

      {showGrade && submission.graded_at ? (
        <>
          <Separator />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-muted-foreground">Điểm</span>
              <span className="text-2xl font-semibold tabular-nums">
                {formatScore(submission.score)}
              </span>
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>

            {submission.feedback ? (
              <p className="mt-2 text-sm whitespace-pre-line text-pretty">
                <span className="text-muted-foreground">Nhận xét: </span>
                {submission.feedback}
              </p>
            ) : null}

            <p className="mt-2 text-xs text-muted-foreground">
              Chấm lúc {formatDateTime(submission.graded_at)}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
