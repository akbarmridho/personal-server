export function loader() {
  return new Response(null, { status: 404 });
}

export default function CatchAll() {
  return null;
}
