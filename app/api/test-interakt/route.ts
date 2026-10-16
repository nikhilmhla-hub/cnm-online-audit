// Public diagnostics must never create contacts or send external test requests.
export async function GET() {
  return Response.json({ error: "Not found" }, { status: 404 });
}
