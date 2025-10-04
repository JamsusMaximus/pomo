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
          // Hide first name, last name, and username fields
          formFieldInput__firstName: { display: "none !important" },
          formFieldInput__lastName: { display: "none !important" },
          formFieldRow__firstName: { display: "none !important" },
          formFieldRow__lastName: { display: "none !important" },
          formFieldLabel__firstName: { display: "none !important" },
          formFieldLabel__lastName: { display: "none !important" },
          formField__firstName: { display: "none !important" },
          formField__lastName: { display: "none !important" },
          formFieldInput__username: { display: "none !important" },
          formFieldRow__username: { display: "none !important" },
          formFieldLabel__username: { display: "none !important" },
          formField__username: { display: "none !important" },
          // Style social buttons (Google) to be full width and prominent
          socialButtonsBlockButton: {
            width: "100%",
            fontSize: "16px",
            padding: "14px",
            fontWeight: "500",
          },
          socialButtonsBlockButtonText: {
            fontSize: "16px",
            fontWeight: "500",
          },
        },
        layout: {
          socialButtonsPlacement: "top",
          showOptionalFields: false,
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
