import { RoomPageClient } from "@/components/ritual/RitualStage";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomPageClient code={code} />;
}

