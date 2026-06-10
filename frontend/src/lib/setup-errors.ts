export function describeSetupError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes('fetch failed') ||
    lower.includes('econnrefused') ||
    lower.includes('failed to fetch') ||
    lower.includes('network')
  ) {
    return 'Cannot reach the API. Start the backend with `cd backend && uvicorn app.main:app --port 3001` and confirm PostgreSQL is running with migrations applied.';
  }

  if (lower.includes('not a member of any organization')) {
    return 'Your account is not linked to an organization yet. Refresh the page—the API will auto-create one on first login.';
  }

  if (lower.includes('invalid token') || lower.includes('unauthorized') || lower.includes('not authenticated')) {
    return 'Session expired or invalid. Sign out and sign in again.';
  }

  if (
    lower.includes('relation "projects" does not exist') ||
    lower.includes('column "project_id" does not exist') ||
    lower.includes('internal server error')
  ) {
    return 'Database migration required. Run the backend migrations (cd backend && alembic upgrade head) — then restart the API.';
  }

  return message;
}
