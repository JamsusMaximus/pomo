"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          formFieldInput__firstName: { display: "none" },
          formFieldInput__lastName: { display: "none" },
          formFieldRow__firstName: { display: "none" },
          formFieldRow__lastName: { display: "none" },
          formFieldLabel__firstName: { display: "none" },
          formFieldLabel__lastName: { display: "none" },
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
