"use client";

import { useState, useTransition } from "react";
import { Pin, PinOff, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/page/EmptyState";
import { addCustomerNoteAction, setCustomerNotePinnedAction } from "./actions";

export interface CustomerNoteView {
  id: string;
  body: string;
  pinned: boolean;
  createdBy: string;
  createdAt: Date;
}

const when = (date: Date) =>
  new Date(date).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function CustomerNotes({ userId, notes }: { userId: string; notes: CustomerNoteView[] }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const addNote = () => startTransition(async () => {
    setError(null);
    const result = await addCustomerNoteAction(userId, body);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody("");
  });

  const togglePin = (id: string, pinned: boolean) => startTransition(async () => {
    setError(null);
    const result = await setCustomerNotePinnedAction(id, !pinned);
    if (!result.ok) setError(result.error);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="size-4" /> Staff notes
        </CardTitle>
        <p className="text-muted-foreground text-sm">Visible only to console users with customer access.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            placeholder="Add an internal note…"
            aria-label="Add a staff note"
          />
          <div className="flex items-center justify-between gap-3">
            {error ? <p role="alert" className="text-destructive text-sm">{error}</p> : <span className="text-muted-foreground text-xs">{body.length}/2,000</span>}
            <Button size="sm" onClick={addNote} disabled={pending || !body.trim()}>
              {pending ? "Saving…" : "Add note"}
            </Button>
          </div>
        </div>

        {notes.length === 0 ? (
          <EmptyState compact icon={StickyNote} title="No notes yet" description="Add context for the next person reviewing this customer." />
        ) : (
          <div className="divide-y rounded-lg border">
            {notes.map((note) => (
              <article key={note.id} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {note.createdBy} · {when(note.createdAt)}
                    {note.pinned && <span className="text-primary ml-2 font-medium">Pinned</span>}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={note.pinned ? "Unpin note" : "Pin note"}
                  title={note.pinned ? "Unpin note" : "Pin note"}
                  disabled={pending}
                  onClick={() => togglePin(note.id, note.pinned)}
                >
                  {note.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                </Button>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
