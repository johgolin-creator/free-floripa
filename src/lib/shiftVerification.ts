export function getShiftVerificationCode(jobId: string, workerId: string) {
  const source = `${jobId}:${workerId}`;
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 10000;
  }

  return String(hash).padStart(4, "0");
}
