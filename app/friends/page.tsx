"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "@/components/motion";
import { FriendCard } from "@/components/FriendCard";
import { Users } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function FriendsPageContent() {
  const { user } = useUser();
  const friendsActivity = useQuery(api.follows.getFriendsActivity);
  const suggestedFriends = useQuery(api.follows.getSuggestedFriends);

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 pt-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Please sign in</h1>
          <p className="text-muted-foreground">You need to be signed in to view your friends.</p>
        </div>
      </main>
    );
  }

  // Show loading state while loading
  if (friendsActivity === undefined || suggestedFriends === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent mb-4"></div>
          <h1 className="text-xl font-semibold">Loading friends...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 pt-6 md:pt-24 pb-20 md:pb-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Friends List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="space-y-4"
        >
          {friendsActivity.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold">Friends ({friendsActivity.length})</h2>
              </div>
              {friendsActivity.map((friend, index) => (
                <FriendCard key={friend._id} friend={friend} index={index} />
              ))}
            </>
          ) : (
            <div className="bg-card rounded-2xl shadow-lg border border-border p-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">No Friends Yet</h3>
              <p className="text-sm text-muted-foreground">
                Follow other users to see their activity here!
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Visit public profiles and click Follow to stay motivated together
              </p>
            </div>
          )}
        </motion.div>

        {/* Suggested Friends */}
        {suggestedFriends.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">Suggested Friends ({suggestedFriends.length})</h2>
            </div>
            {suggestedFriends.map((friend, index) => (
              <FriendCard key={friend._id} friend={friend} index={index} />
            ))}
          </motion.div>
        )}
      </div>
    </main>
  );
}

export default function FriendsPage() {
  return (
    <ErrorBoundary
      fallbackTitle="Friends Error"
      fallbackMessage="An error occurred while loading your friends. Please refresh the page."
    >
      <FriendsPageContent />
    </ErrorBoundary>
  );
}
