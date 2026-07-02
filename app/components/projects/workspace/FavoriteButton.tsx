"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";

export default function FavoriteButton({
  projectId,
  initialFavorite,
  size = 16,
}: {
  projectId: string;
  initialFavorite: boolean;
  size?: number;
}) {
  const { userId, company } = useSession();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !favorite;
    setFavorite(next);
    const supabase = createClient();
    if (next) {
      await supabase.from("project_favorites").insert({ company_id: company!.id, project_id: projectId, user_id: userId });
    } else {
      await supabase.from("project_favorites").delete().eq("project_id", projectId).eq("user_id", userId);
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      className="btn-ghost"
      style={{ padding: 6, borderRadius: 8, color: favorite ? "var(--gold)" : "var(--text-muted)" }}
      aria-label={favorite ? "إزالة من المميزة" : "إضافة للمميزة"}
      title={favorite ? "إزالة من المميزة" : "إضافة للمميزة"}
    >
      <Icon name="star" size={size} filled={favorite} />
    </button>
  );
}
