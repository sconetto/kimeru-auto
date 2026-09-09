"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  type LucideIcon,
  Quote,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";

// tiptap-markdown ships no Storage augmentation for @tiptap/core v3 — add it
// so `editor.storage.markdown.getMarkdown()` is fully typed.
declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

/* ------------------------------------------------------------------ */
/* MarkdownEditor — WYSIWYG editor whose value is a markdown string    */
/* ------------------------------------------------------------------ */

interface MarkdownEditorProps {
  /** Markdown document shown in the editor (controlled value). */
  value: string;
  /** Emits the whole document as markdown on every edit. */
  onChange: (markdown: string) => void;
  /** Applied to the contenteditable element so a <label htmlFor> can target it. */
  id?: string;
}

interface ToolbarState {
  bold: boolean;
  italic: boolean;
  heading2: boolean;
  heading3: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
}

const TOOLBAR_INACTIVE: ToolbarState = {
  bold: false,
  italic: false,
  heading2: false,
  heading3: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
};

export function MarkdownEditor({ value, onChange, id }: MarkdownEditorProps) {
  // Last markdown string known to be reflected in the editor. Used to tell
  // parent-driven value changes apart from echoes of our own onChange.
  const lastSyncedMarkdown = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Keep the editable surface aligned with the markdown that round-trips
        // through tiptap-markdown and renders on the public site (plain
        // react-markdown, no GFM): no underline/strike/code/hr, H2+H3 only.
        heading: { levels: [2, 3] },
        underline: false,
        strike: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
      }),
    ],
    content: value,
    // Avoid SSR/hydration mismatches — the editor mounts after hydration.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class:
          "prose prose-invert prose-sm max-w-none min-h-[256px] bg-slate-950 px-4 py-3 text-slate-100 focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      const markdown = current.storage.markdown.getMarkdown();
      lastSyncedMarkdown.current = markdown;
      onChange(markdown);
    },
  });

  // Sync external value changes (e.g. a fresh AI generation) into the editor
  // without emitting an update, so the control never fights its parent.
  useEffect(() => {
    if (!editor || value === lastSyncedMarkdown.current) return;
    lastSyncedMarkdown.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const toolbar =
    useEditorState({
      editor,
      selector: ({ editor: current }) =>
        current
          ? {
              bold: current.isActive("bold"),
              italic: current.isActive("italic"),
              heading2: current.isActive("heading", { level: 2 }),
              heading3: current.isActive("heading", { level: 3 }),
              bulletList: current.isActive("bulletList"),
              orderedList: current.isActive("orderedList"),
              blockquote: current.isActive("blockquote"),
            }
          : TOOLBAR_INACTIVE,
    }) ?? TOOLBAR_INACTIVE;

  const buttons: { icon: LucideIcon; label: string; active: boolean; run: () => void }[] = [
    {
      icon: Bold,
      label: "Negrito",
      active: toolbar.bold,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      icon: Italic,
      label: "Itálico",
      active: toolbar.italic,
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      icon: Heading2,
      label: "Título 2",
      active: toolbar.heading2,
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: Heading3,
      label: "Título 3",
      active: toolbar.heading3,
      run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: List,
      label: "Lista com marcadores",
      active: toolbar.bulletList,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      icon: ListOrdered,
      label: "Lista numerada",
      active: toolbar.orderedList,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: Quote,
      label: "Citação",
      active: toolbar.blockquote,
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
  ];

  return (
    <div className="overflow-hidden rounded-md border border-slate-700 bg-slate-900 focus-within:border-blue-500">
      <div
        className="flex flex-wrap items-center gap-1 border-b border-slate-800 px-2 py-1.5"
        role="toolbar"
        aria-label="Formatação do resumo"
      >
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            title={button.label}
            aria-label={button.label}
            aria-pressed={button.active}
            disabled={!editor}
            onClick={button.run}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              button.active
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            } disabled:opacity-50`}
          >
            <button.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
