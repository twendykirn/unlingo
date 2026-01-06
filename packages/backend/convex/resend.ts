"use node";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Workpool } from "@convex-dev/workpool";

export const emailWorkpool = new Workpool(components.emailWorkpool, {
  maxParallelism: 2,
  retryActionsByDefault: true,
  defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
});

export const addEmailToContacts = internalAction({
  args: {
    email: v.string(),
  },
  handler: async (_, args) => {
    try {
      const result = await fetch(
        `https://api.resend.com/contacts/${args.email}/segments/${process.env.RESEND_AUDIENCE_ID}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await result.json();

      if (!data?.id) {
        throw new Error(data?.name || "Rate limit exceeded");
      }
    } catch (error) {
      throw new Error(`Failed to add a contact with email ${args.email}: ${error}`);
    }
  },
});

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (_, args) => {
    try {
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: [args.email],
          template: {
            id: process.env.RESEND_TEMPLATE_WELCOME_ID,
            variables: {
              NAME: args.name,
            },
          },
        }),
      });

      const data = await result.json();

      if (!data?.id) {
        throw new Error(data?.name || "Rate limit exceeded");
      }
    } catch (error) {
      throw new Error(`Failed to welcome email to ${args.email}: ${error}`);
    }
  },
});

export const sendLimitsEmail = internalAction({
  args: {
    email: v.string(),
    currentUsage: v.number(),
  },
  handler: async (_, args) => {
    const templateId =
      args.currentUsage === 80
        ? process.env.RESEND_TEMPLATE_USAGE_WARNING_ID
        : args.currentUsage === 100
          ? process.env.RESEND_TEMPLATE_USAGE_LIMIT_REACHED_ID
          : process.env.RESEND_TEMPLATE_USAGE_OVER_LIMIT_ID;

    try {
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: [args.email],
          template: {
            id: templateId,
          },
        }),
      });

      const data = await result.json();

      if (!data?.id) {
        throw new Error(data?.name || "Rate limit exceeded");
      }
    } catch (error) {
      throw new Error(`Failed to limit email to ${args.email}: ${error}`);
    }
  },
});
