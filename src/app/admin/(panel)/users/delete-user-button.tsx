"use client";

import { Trash2 } from "lucide-react";
import { deleteUser } from "./actions";

export function DeleteUserButton({ id, email }: { id: number; email: string }) {
  return (
    <form
      action={deleteUser}
      onSubmit={(e) => {
        if (!confirm(`Excluir ${email}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
        aria-label="Excluir usuário"
        title="Excluir usuário"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
