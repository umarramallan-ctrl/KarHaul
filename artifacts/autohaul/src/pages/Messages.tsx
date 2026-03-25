import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useListConversations } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelative } from "@/lib/format";
import { MessageSquare } from "lucide-react";

// Note: In a real app, clicking a conversation would open a chat view.
// For this MVP frontend structure, we display the list.

export default function Messages() {
  const { data, isLoading } = useListConversations();

  return (
    <AuthGuard>
      <MainLayout>
        <div className="container max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-4rem)] flex flex-col">
          <h1 className="text-2xl font-display font-bold mb-6">Messages</h1>
          
          <Card className="flex-1 flex flex-col overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : !data?.conversations || data.conversations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-slate-50 dark:bg-slate-900/20">
                <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground mb-1">No messages yet</h3>
                <p>When you book a transport, you'll be able to chat directly with the other party here.</p>
              </div>
            ) : (
              <div className="divide-y overflow-y-auto flex-1">
                {data.conversations.map((conv) => (
                  <div key={conv.id} className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex items-start gap-4">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={conv.otherUserAvatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {conv.otherUserName?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-semibold text-base truncate pr-4">{conv.otherUserName}</h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelative(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-primary mb-1 truncate">
                        Re: {conv.shipmentTitle}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
