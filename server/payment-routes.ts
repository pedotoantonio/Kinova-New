import { Router, Request, Response } from "express";
import { db } from "./db";
import { paymentSettings, paymentPlans, donationLogs, families } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

const router = Router();

async function getOrCreatePaymentSettings() {
  const existing = await db.select().from(paymentSettings).limit(1);
  if (existing.length > 0) {
    return existing[0];
  }
  const [created] = await db.insert(paymentSettings).values({}).returning();
  return created;
}

router.get("/config", async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreatePaymentSettings();
    const activePlans = await db
      .select()
      .from(paymentPlans)
      .where(eq(paymentPlans.isActive, true))
      .orderBy(paymentPlans.sortOrder);

    const suggestedAmounts = settings.freeDonationSuggestedAmounts
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));

    res.json({
      freeDonation: {
        enabled: settings.freeDonationEnabled,
        minAmount: parseFloat(settings.freeDonationMinAmount),
        maxAmount: parseFloat(settings.freeDonationMaxAmount),
        suggestedAmounts,
        currency: settings.currency,
      },
      fixedPlans: {
        enabled: settings.fixedPlansEnabled,
        plans: activePlans.filter((p) => p.type === "fixed"),
      },
      subscriptions: {
        enabled: settings.subscriptionsEnabled,
        plans: activePlans.filter((p) => p.type === "subscription"),
      },
    });
  } catch (error) {
    console.error("Error fetching payment config:", error);
    res.status(500).json({ error: "Failed to fetch payment configuration" });
  }
});

router.post("/create-donation-session", async (req: Request, res: Response) => {
  try {
    const { amount, familyId } = req.body;

    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const settings = await getOrCreatePaymentSettings();

    if (!settings.freeDonationEnabled) {
      return res.status(400).json({ error: "Donations are currently disabled" });
    }

    const minAmount = parseFloat(settings.freeDonationMinAmount);
    const maxAmount = parseFloat(settings.freeDonationMaxAmount);

    if (amount < minAmount || amount > maxAmount) {
      return res.status(400).json({
        error: `Amount must be between ${minAmount} and ${maxAmount} ${settings.currency}`,
      });
    }

    const stripe = await getUncachableStripeClient();

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: settings.currency.toLowerCase(),
            product_data: {
              name: "Donazione Kinova",
              description: "Supporta lo sviluppo di Kinova",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/donation/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/donation/cancel`,
      metadata: {
        familyId: familyId || "",
        donationType: "free_donation",
      },
    });

    const [donationLog] = await db
      .insert(donationLogs)
      .values({
        familyId: familyId || null,
        amount: amount.toFixed(2),
        currency: settings.currency,
        paymentProvider: "stripe",
        paymentId: session.id,
        status: "pending",
      })
      .returning();

    res.json({
      sessionId: session.id,
      url: session.url,
      donationId: donationLog.id,
    });
  } catch (error) {
    console.error("Error creating donation session:", error);
    res.status(500).json({ error: "Failed to create donation session" });
  }
});

router.get("/publishable-key", async (req: Request, res: Response) => {
  try {
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  } catch (error) {
    console.error("Error fetching publishable key:", error);
    res.status(500).json({ error: "Failed to fetch Stripe key" });
  }
});

router.post("/verify-donation", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      await db
        .update(donationLogs)
        .set({ status: "completed" })
        .where(eq(donationLogs.paymentId, sessionId));

      const familyId = session.metadata?.familyId;
      if (familyId) {
        await db
          .update(families)
          .set({ planType: "donor" })
          .where(eq(families.id, familyId));
      }

      res.json({ success: true, status: "completed" });
    } else {
      res.json({ success: false, status: session.payment_status });
    }
  } catch (error) {
    console.error("Error verifying donation:", error);
    res.status(500).json({ error: "Failed to verify donation" });
  }
});

export default router;
