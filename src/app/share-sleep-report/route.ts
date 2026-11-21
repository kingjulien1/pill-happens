/** Old/unavailable workers must not parse or store a shared report on the server. */
export function POST(request: Request) {
  return Response.redirect(
    new URL("/sleep-import?error=unavailable", request.url),
    303,
  );
}
