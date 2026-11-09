import { InviteAccept } from "@/components/invitation/InvitationCard";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteAccept token={token} />;
}

