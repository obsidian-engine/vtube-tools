import { useDraggable } from "@dnd-kit/core";
import type { Template } from "../pages/Templates";

const PRIVACY_LABELS = { public: "公開", unlisted: "限定公開", private: "非公開" } as const;

function PaletteCard({
  template,
  selected,
  onSelect,
}: {
  template: Template;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tpl:${template.id}`,
    data: { type: "template", templateId: template.id },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      {...listeners}
      {...attributes}
      className={`w-full cursor-grab touch-none rounded-xl border px-4 py-3 text-left transition-colors active:cursor-grabbing ${
        selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white hover:border-neutral-300"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <p className="truncate text-sm font-medium">{template.name}</p>
      <p className={`truncate text-xs ${selected ? "text-neutral-300" : "text-neutral-500"}`}>
        {template.title}
      </p>
      <span
        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${
          selected ? "bg-white/20" : "bg-neutral-100 text-neutral-500"
        }`}
      >
        {PRIVACY_LABELS[template.privacy]}
      </span>
    </button>
  );
}

export default function TemplatePalette({
  templates,
  selectedTemplateId,
  onSelectTemplate,
}: {
  templates: Template[];
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-400">
        テンプレートを曜日にドラッグ、またはタップで選択してから曜日をタップ
      </p>
      {templates.length === 0 ? (
        <p className="text-sm text-neutral-400">先にテンプレートを作成してください。</p>
      ) : (
        templates.map((t) => (
          <PaletteCard
            key={t.id}
            template={t}
            selected={selectedTemplateId === t.id}
            onSelect={() => onSelectTemplate(selectedTemplateId === t.id ? null : t.id)}
          />
        ))
      )}
    </div>
  );
}
