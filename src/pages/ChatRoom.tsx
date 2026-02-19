import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ChatView } from "@/components/chat/ChatView";

export default function ChatRoom() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <ChatView />
      </div>
    </DashboardLayout>
  );
}
