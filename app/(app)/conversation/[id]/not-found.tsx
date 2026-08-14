export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Conversation not found</h1>
      <p className="max-w-md text-muted-foreground">
        This conversation may have been removed, or you may no longer be a member.
      </p>
      <a href="/inbox" className="font-medium text-primary underline-offset-2 hover:underline">
        Back to inbox
      </a>
    </div>
  );
}
