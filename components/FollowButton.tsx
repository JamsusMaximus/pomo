"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

interface FollowButtonProps {
  username: string;
}

export function FollowButton({ username }: FollowButtonProps) {
  const { isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const isFollowing = useQuery(api.follows.isFollowing, { username });
  const followUser = useMutation(api.follows.followUser);
  const unfollowUser = useMutation(api.follows.unfollowUser);

  const handleToggleFollow = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser({ usernameToUnfollow: username });
      } else {
        await followUser({ usernameToFollow: username });
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error);
      alert(error instanceof Error ? error.message : "Failed to toggle follow");
    } finally {
      setIsLoading(false);
    }
  };

  // If not signed in, show signup button
  if (!isSignedIn) {
    return (
      <Link href="/sign-up">
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
          <UserPlus className="w-4 h-4 mr-2" />
          Signup & Follow
        </Button>
      </Link>
    );
  }

  return (
    <Button
      onClick={handleToggleFollow}
      disabled={isLoading}
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      className={
        isFollowing
          ? "border-orange-500/30 hover:bg-red-500/10 hover:border-red-500"
          : "bg-orange-500 hover:bg-orange-600"
      }
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : isFollowing ? (
        <UserMinus className="w-4 h-4 mr-2" />
      ) : (
        <UserPlus className="w-4 h-4 mr-2" />
      )}
      {isFollowing ? "Unfollow" : "Follow"}
    </Button>
  );
}
