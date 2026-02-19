import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ConversationList } from "@/components/chat/ConversationList";

export default function Chat() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
        <ConversationList />
      </div>
    </DashboardLayout>
  );
}
