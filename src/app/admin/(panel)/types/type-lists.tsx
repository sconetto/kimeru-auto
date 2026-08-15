"use client";

import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  deleteSpecGroup,
  deleteVehicleCategory,
  reorderType,
  updateSpecGroup,
  updateVehicleCategory,
} from "./actions";

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface GroupRow {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
}

export function CategoryList({ items }: { items: CategoryRow[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((cat, idx) => (
        <TypeRow
          key={cat.id}
          kind="vehicle_category"
          id={cat.id}
          name={cat.name}
          displayOrder={cat.displayOrder}
          canMoveUp={idx > 0}
          canMoveDown={idx < items.length - 1}
          deleteAction={deleteVehicleCategory}
          deleteLabel="Excluir categoria"
        />
      ))}
    </div>
  );
}

export function GroupList({ items }: { items: GroupRow[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((g, idx) => (
        <TypeRow
          key={g.id}
          kind="spec_group"
          id={g.id}
          name={g.name}
          displayOrder={g.displayOrder}
          canMoveUp={idx > 0}
          canMoveDown={idx < items.length - 1}
          deleteAction={deleteSpecGroup}
          deleteLabel="Excluir grupo"
        />
      ))}
    </div>
  );
}

function TypeRow({
  kind,
  id,
  name,
  canMoveUp,
  canMoveDown,
  deleteAction,
  deleteLabel,
}: {
  kind: "vehicle_category" | "spec_group";
  id: number;
  name: string;
  displayOrder: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  deleteAction: (f: FormData) => Promise<void>;
  deleteLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  if (editing) {
    return (
      <form
        data-name={name}
        action={kind === "vehicle_category" ? updateVehicleCategory : updateSpecGroup}
        className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2"
      >
        <input type="hidden" name="id" value={id} />
        <input
          name="name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(name);
            setEditing(false);
          }}
          className="rounded-md px-2 py-1 text-xs text-slate-400 hover:text-white"
        >
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <div
      data-name={name}
      className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
    >
      <span className="text-white">{name}</span>
      <div className="flex items-center gap-1">
        <form action={reorderType}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="direction" value="up" />
          <button
            type="submit"
            disabled={!canMoveUp}
            className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-30"
            aria-label="Mover para cima"
            title="Mover para cima"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </form>
        <form action={reorderType}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="direction" value="down" />
          <button
            type="submit"
            disabled={!canMoveDown}
            className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-30"
            aria-label="Mover para baixo"
            title="Mover para baixo"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </form>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-1.5 text-slate-400 hover:text-blue-400"
          aria-label="Renomear"
          title="Renomear"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!confirm(`Excluir "${name}"?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="rounded p-1.5 text-slate-400 hover:text-red-400"
            aria-label={deleteLabel}
            title={deleteLabel}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
