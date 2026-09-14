"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Snapshot } from "@/lib/catchment/model";
export type Action = (body: Record<string, unknown>) => Promise<boolean>;
export type Props = { data: Snapshot; act: Action; busy: boolean };
export function Choice({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <Select disabled={disabled} value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="choice-trigger">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem value={o.value} key={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function when(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function NumberScore({ score }: { score: number }) {
  return (
    <span className={`score ${score >= 60 ? "high" : "mid"}`}>
      {score}
      <small>/100</small>
    </span>
  );
}
