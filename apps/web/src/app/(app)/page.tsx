"use client";

import { AvaChat } from "@/components/AvaChat";
import { useSession } from "@/components/session";

export default function AvaHome() {
  const { meta } = useSession();
  return <AvaChat avaName={meta.ava_name} />;
}
