import type { Express, Response, NextFunction, Request } from "express";
import OpenAI from "openai";
import { storage } from "./storage";
import type { UserRole } from "@shared/schema";
import fs from "node:fs";
import path from "node:path";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface AuthRequest extends Request {
  auth?: {
    userId: string;
    familyId: string;
    role: UserRole;
    tokenId: string;
  };
}

interface KinovaContext {
  todayEvents: Array<{ title: string; startDate: string; endDate?: string; category: string }>;
  upcomingEvents: Array<{ title: string; startDate: string; category: string }>;
  pendingTasks: Array<{ title: string; dueDate?: string; priority: string; assignedTo?: string }>;
  overdueTasks: Array<{ title: string; dueDate: string; priority: string }>;
  shoppingList: Array<{ name: string; quantity: number; purchased: boolean }>;
  monthlyBudget: { total: number; byCategory: Record<string, number> };
  familyMembers: Array<{ id: string; displayName: string; role: string }>;
  userRole: UserRole;
  userName: string;
  language: string;
}

async function getKinovaContext(familyId: string, userId: string, language: string = "it"): Promise<KinovaContext> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [events, tasks, shoppingItems, expenses, members, user] = await Promise.all([
    storage.getEvents(familyId, todayStart, weekEnd),
    storage.getTasks(familyId),
    storage.getShoppingItems(familyId),
    storage.getExpenses(familyId, { from: monthStart, to: monthEnd }),
    storage.getFamilyMembers(familyId),
    storage.getUser(userId),
  ]);

  const todayEvents = events
    .filter((e) => {
      const start = new Date(e.startDate);
      return start >= todayStart && start < todayEnd;
    })
    .map((e) => ({
      title: e.title,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate?.toISOString(),
      category: e.category,
    }));

  const upcomingEvents = events
    .filter((e) => new Date(e.startDate) >= todayEnd)
    .slice(0, 5)
    .map((e) => ({
      title: e.title,
      startDate: e.startDate.toISOString(),
      category: e.category,
    }));

  const pendingTasks = tasks
    .filter((t) => !t.completed)
    .map((t) => ({
      title: t.title,
      dueDate: t.dueDate?.toISOString(),
      priority: t.priority,
      assignedTo: members.find((m) => m.id === t.assignedTo)?.displayName || undefined,
    }));

  const overdueTasks = tasks
    .filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) < now)
    .map((t) => ({
      title: t.title,
      dueDate: t.dueDate!.toISOString(),
      priority: t.priority,
    }));

  const shoppingList = shoppingItems.map((s) => ({
    name: s.name,
    quantity: s.quantity,
    purchased: s.purchased,
  }));

  const total = expenses.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);
  const byCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.category || "other";
    byCategory[cat] = (byCategory[cat] || 0) + parseFloat(String(e.amount));
  });

  return {
    todayEvents,
    upcomingEvents,
    pendingTasks,
    overdueTasks,
    shoppingList,
    monthlyBudget: { total, byCategory },
    familyMembers: members.map((m) => ({ id: m.id, displayName: m.displayName || m.username, role: m.role })),
    userRole: user?.role || "member",
    userName: user?.displayName || user?.username || "Utente",
    language,
  };
}

function buildSystemPrompt(context: KinovaContext, language: string): string {
  const isChild = context.userRole === "child";
  const isItalian = language === "it";

  const dateStr = new Date().toLocaleDateString(isItalian ? "it-IT" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let prompt = isItalian
    ? `Sei l'assistente AI di Kinova, un'app per la gestione della famiglia. Oggi è ${dateStr}.
L'utente si chiama ${context.userName} e ha il ruolo di ${context.userRole}.

CONTESTO FAMIGLIA ATTUALE:
`
    : `You are Kinova's AI assistant, a family management app. Today is ${dateStr}.
The user's name is ${context.userName} with role ${context.userRole}.

CURRENT FAMILY CONTEXT:
`;

  if (context.todayEvents.length > 0) {
    prompt += isItalian ? "\n📅 Eventi di oggi:\n" : "\n📅 Today's events:\n";
    context.todayEvents.forEach((e) => {
      const time = new Date(e.startDate).toLocaleTimeString(isItalian ? "it-IT" : "en-US", { hour: "2-digit", minute: "2-digit" });
      prompt += `- ${e.title} (${time})\n`;
    });
  }

  if (context.upcomingEvents.length > 0) {
    prompt += isItalian ? "\n📆 Prossimi eventi:\n" : "\n📆 Upcoming events:\n";
    context.upcomingEvents.forEach((e) => {
      const date = new Date(e.startDate).toLocaleDateString(isItalian ? "it-IT" : "en-US");
      prompt += `- ${e.title} (${date})\n`;
    });
  }

  if (context.pendingTasks.length > 0) {
    prompt += isItalian ? "\n✅ Attività da fare:\n" : "\n✅ Pending tasks:\n";
    context.pendingTasks.slice(0, 5).forEach((t) => {
      prompt += `- ${t.title}${t.assignedTo ? ` (assegnata a ${t.assignedTo})` : ""}\n`;
    });
  }

  if (context.overdueTasks.length > 0) {
    prompt += isItalian ? "\n⚠️ Attività scadute:\n" : "\n⚠️ Overdue tasks:\n";
    context.overdueTasks.forEach((t) => {
      prompt += `- ${t.title}\n`;
    });
  }

  const toBuy = context.shoppingList.filter((s) => !s.purchased);
  if (toBuy.length > 0) {
    prompt += isItalian ? "\n🛒 Lista spesa:\n" : "\n🛒 Shopping list:\n";
    toBuy.slice(0, 10).forEach((s) => {
      prompt += `- ${s.name} (${s.quantity})\n`;
    });
  }

  prompt += isItalian
    ? `\n💰 Budget mensile: €${context.monthlyBudget.total.toFixed(2)}\n`
    : `\n💰 Monthly budget: €${context.monthlyBudget.total.toFixed(2)}\n`;

  prompt += isItalian ? "\n👨‍👩‍👧‍👦 Membri famiglia:\n" : "\n👨‍👩‍👧‍👦 Family members:\n";
  context.familyMembers.forEach((m) => {
    prompt += `- ${m.displayName} (${m.role})\n`;
  });

  prompt += isItalian
    ? `
REGOLE IMPORTANTI:
1. Rispondi SEMPRE in italiano
2. Usa un tono amichevole e familiare
3. Mantieni il CONTESTO della conversazione - ricorda cosa è stato detto prima
4. Se l'utente chiede di MODIFICARE dati (aggiungere evento, completare task, aggiungere spesa, aggiungere alla lista, ecc.), NON eseguire mai l'azione direttamente
5. Proponi l'azione con il formato specifico e chiedi conferma
6. DEVI SEMPRE usare questo formato ESATTO per proporre azioni:

   [AZIONE_PROPOSTA: tipo_azione | {"campo1":"valore1","campo2":"valore2"}]

7. Tipi di azione disponibili:
   - add_shopping_item: {"name":"nome prodotto","quantity":1,"category":"categoria"}
   - add_shopping_items: {"items":[{"name":"prodotto1","quantity":1},{"name":"prodotto2","quantity":2}]} - PER MULTIPLI PRODOTTI
   - create_event: {"title":"titolo","startDate":"2026-01-10T10:00:00","description":"desc"}
   - create_task: {"title":"titolo","dueDate":"2026-01-15","priority":"medium"}
   - create_expense: {"amount":50.00,"description":"desc","category":"food"}
   - complete_task: {"id":"task-uuid"}

8. ESEMPIO CORRETTO per UN prodotto:
   "Vuoi che aggiunga 'latte' alla lista della spesa? [AZIONE_PROPOSTA: add_shopping_item | {"name":"latte","quantity":1}] Confermi?"

9. ESEMPIO CORRETTO per MULTIPLI prodotti (ingredienti ricette, liste):
   "Ecco gli ingredienti da aggiungere: [AZIONE_PROPOSTA: add_shopping_items | {"items":[{"name":"cipolla","quantity":1},{"name":"carote","quantity":2},{"name":"sedano","quantity":1}]}] Confermi?"

10. IMPORTANTE: Quando l'utente chiede di aggiungere PIÙ prodotti (es. ingredienti di una ricetta), USA SEMPRE add_shopping_items con un array di items!

11. Mai dire "Ho fatto" o "Ho aggiunto" senza che l'utente abbia confermato prima!

12. RICERCA INTERNET: Puoi cercare informazioni su internet per rispondere a domande su:
    - Ricette e ingredienti
    - Notizie e attualità
    - Meteo e previsioni
    - Informazioni generali
    Usa le tue conoscenze per fornire risposte utili alla famiglia.
`
    : `
IMPORTANT RULES:
1. ALWAYS respond in English
2. Use a friendly, familiar tone
3. Maintain conversation CONTEXT - remember what was said before
4. If the user asks to MODIFY data (add event, complete task, add expense, add to list, etc.), NEVER execute the action directly
5. Propose the action with the specific format and ask for confirmation
6. You MUST ALWAYS use this EXACT format to propose actions:

   [PROPOSED_ACTION: action_type | {"field1":"value1","field2":"value2"}]

7. Available action types:
   - add_shopping_item: {"name":"product name","quantity":1,"category":"category"}
   - add_shopping_items: {"items":[{"name":"product1","quantity":1},{"name":"product2","quantity":2}]} - FOR MULTIPLE ITEMS
   - create_event: {"title":"title","startDate":"2026-01-10T10:00:00","description":"desc"}
   - create_task: {"title":"title","dueDate":"2026-01-15","priority":"medium"}
   - create_expense: {"amount":50.00,"description":"desc","category":"food"}
   - complete_task: {"id":"task-uuid"}

8. CORRECT EXAMPLE for ONE product:
   "Would you like me to add 'milk' to the shopping list? [PROPOSED_ACTION: add_shopping_item | {"name":"milk","quantity":1}] Do you confirm?"

9. CORRECT EXAMPLE for MULTIPLE products (recipe ingredients, lists):
   "Here are the ingredients to add: [PROPOSED_ACTION: add_shopping_items | {"items":[{"name":"onion","quantity":1},{"name":"carrots","quantity":2},{"name":"celery","quantity":1}]}] Do you confirm?"

10. IMPORTANT: When the user asks to add MULTIPLE products (e.g. recipe ingredients), ALWAYS USE add_shopping_items with an items array!

11. Never say "Done" or "I've added" without the user confirming first!

12. WEB SEARCH: You can search for information on the internet to answer questions about:
    - Recipes and ingredients
    - News and current events
    - Weather and forecasts
    - General information
    Use your knowledge to provide helpful answers to the family.
`;

  if (isChild) {
    prompt += isItalian
      ? `\n⚠️ L'utente è un bambino. Usa un linguaggio semplice e NON permettere azioni distruttive come eliminazioni.`
      : `\n⚠️ The user is a child. Use simple language and DO NOT allow destructive actions like deletions.`;
  }

  return prompt;
}

function extractProposedAction(content: string): { type: string; data: unknown } | null {
  const actionMatch = content.match(/\[(?:AZIONE_PROPOSTA|PROPOSED_ACTION):\s*(\w+)\s*\|\s*(.+?)\]/);
  if (actionMatch) {
    try {
      return {
        type: actionMatch[1],
        data: JSON.parse(actionMatch[2]),
      };
    } catch {
      return { type: actionMatch[1], data: actionMatch[2] };
    }
  }
  return null;
}

export function registerAssistantRoutes(app: Express, authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => void): void {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.get("/api/assistant/conversations", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const conversations = await storage.getAssistantConversations(req.auth!.familyId, req.auth!.userId);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/assistant/conversations", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await storage.createAssistantConversation({
        familyId: req.auth!.familyId,
        userId: req.auth!.userId,
        title: title || null,
      });
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/assistant/conversations/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const conversation = await storage.getAssistantConversation(req.params.id, req.auth!.familyId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await storage.getAssistantMessages(req.params.id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.delete("/api/assistant/conversations/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const conversation = await storage.getAssistantConversation(req.params.id, req.auth!.familyId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      await storage.deleteAssistantConversation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete conversation error:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/assistant/chat", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId, content, attachments, language = "it" } = req.body;

      if (!conversationId || !content) {
        return res.status(400).json({ error: "conversationId and content are required" });
      }

      const conversation = await storage.getAssistantConversation(conversationId, req.auth!.familyId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      await storage.createAssistantMessage({
        conversationId,
        role: "user",
        content,
        attachments: attachments ? JSON.stringify(attachments) : null,
      });

      const history = await storage.getAssistantMessages(conversationId);
      const context = await getKinovaContext(req.auth!.familyId, req.auth!.userId, language);
      const systemPrompt = buildSystemPrompt(context, language);

      const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      const recentHistory = history.slice(-20);
      recentHistory.forEach((m) => {
        chatMessages.push({
          role: m.role as "user" | "assistant",
          content: m.content,
        });
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 2048,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      await storage.createAssistantMessage({
        conversationId,
        role: "assistant",
        content: fullResponse,
        attachments: null,
      });

      if (!conversation.title && fullResponse.length > 0) {
        const titleContent = content.slice(0, 50) + (content.length > 50 ? "..." : "");
        await storage.updateAssistantConversation(conversationId, { title: titleContent });
      }

      const proposedAction = extractProposedAction(fullResponse);
      res.write(`data: ${JSON.stringify({ done: true, proposedAction })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Errore durante la risposta" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });

  const handleConfirmAction = async (req: AuthRequest, res: Response) => {
    try {
      const { actionType, actionData, conversationId, language = "it" } = req.body;

      if (!actionType || !actionData) {
        return res.status(400).json({ error: "actionType and actionData are required" });
      }

      if (req.auth!.role === "child") {
        const restrictedActions = [
          "create_event", "update_event", "delete_event",
          "create_task", "update_task", "complete_task", "delete_task",
          "create_expense", "update_expense", "delete_expense",
          "add_shopping", "add_shopping_item", "add_shopping_items", "update_shopping", "update_shopping_item", "delete_shopping", "delete_shopping_item", "remove_shopping"
        ];
        if (restrictedActions.includes(actionType)) {
          return res.status(403).json({ 
            success: false,
            error: language === "it" 
              ? "Non hai i permessi per eseguire questa azione. Chiedi a un genitore!" 
              : "You don't have permission to perform this action. Ask a parent!" 
          });
        }
      }

      let result: { success: boolean; message: string; data?: unknown } = { success: false, message: "" };

      switch (actionType) {
        case "create_event": {
          const event = await storage.createEvent({
            familyId: req.auth!.familyId,
            title: actionData.title,
            description: actionData.description || null,
            startDate: new Date(actionData.startDate),
            endDate: actionData.endDate ? new Date(actionData.endDate) : null,
            allDay: actionData.allDay ?? false,
            color: actionData.color || null,
            category: actionData.category || "family",
            assignedTo: actionData.assignedTo || null,
            shortCode: null,
            isHoliday: false,
            createdBy: req.auth!.userId,
          });
          result = { success: true, message: language === "it" ? "Evento creato" : "Event created", data: event };
          break;
        }

        case "update_event": {
          const updated = await storage.updateEvent(actionData.id, req.auth!.familyId, {
            title: actionData.title,
            description: actionData.description,
            startDate: actionData.startDate ? new Date(actionData.startDate) : undefined,
            endDate: actionData.endDate ? new Date(actionData.endDate) : undefined,
            allDay: actionData.allDay,
            color: actionData.color,
            category: actionData.category,
          });
          result = { success: !!updated, message: language === "it" ? "Evento aggiornato" : "Event updated", data: updated };
          break;
        }

        case "delete_event": {
          const deleted = await storage.deleteEvent(actionData.id, req.auth!.familyId);
          result = { success: deleted, message: language === "it" ? "Evento eliminato" : "Event deleted" };
          break;
        }

        case "complete_task": {
          const updatedTask = await storage.updateTask(actionData.taskId || actionData.id, req.auth!.familyId, { completed: true });
          result = { success: !!updatedTask, message: language === "it" ? "Attività completata" : "Task completed", data: updatedTask };
          break;
        }

        case "create_task": {
          const task = await storage.createTask({
            familyId: req.auth!.familyId,
            title: actionData.title,
            description: actionData.description || null,
            dueDate: actionData.dueDate ? new Date(actionData.dueDate) : null,
            assignedTo: actionData.assignedTo || null,
            priority: actionData.priority || "medium",
            completed: false,
            createdBy: req.auth!.userId,
          });
          result = { success: true, message: language === "it" ? "Attività creata" : "Task created", data: task };
          break;
        }

        case "update_task": {
          const updated = await storage.updateTask(actionData.id, req.auth!.familyId, {
            title: actionData.title,
            description: actionData.description,
            dueDate: actionData.dueDate ? new Date(actionData.dueDate) : undefined,
            assignedTo: actionData.assignedTo,
            priority: actionData.priority,
            completed: actionData.completed,
          });
          result = { success: !!updated, message: language === "it" ? "Attività aggiornata" : "Task updated", data: updated };
          break;
        }

        case "delete_task": {
          const deleted = await storage.deleteTask(actionData.id, req.auth!.familyId);
          result = { success: deleted, message: language === "it" ? "Attività eliminata" : "Task deleted" };
          break;
        }

        case "create_expense":
        case "add_expense": {
          const expense = await storage.createExpense({
            familyId: req.auth!.familyId,
            amount: actionData.amount,
            description: actionData.description,
            category: actionData.category || "other",
            paidBy: actionData.paidBy || req.auth!.userId,
            date: new Date(actionData.date || Date.now()),
            createdBy: req.auth!.userId,
          });
          result = { success: true, message: language === "it" ? "Spesa aggiunta" : "Expense added", data: expense };
          break;
        }

        case "update_expense": {
          const updated = await storage.updateExpense(actionData.id, req.auth!.familyId, {
            amount: actionData.amount,
            description: actionData.description,
            category: actionData.category,
            date: actionData.date ? new Date(actionData.date) : undefined,
          });
          result = { success: !!updated, message: language === "it" ? "Spesa aggiornata" : "Expense updated", data: updated };
          break;
        }

        case "delete_expense": {
          const deleted = await storage.deleteExpense(actionData.id, req.auth!.familyId);
          result = { success: deleted, message: language === "it" ? "Spesa eliminata" : "Expense deleted" };
          break;
        }

        case "add_shopping_item":
        case "add_shopping": {
          const item = await storage.createShoppingItem({
            familyId: req.auth!.familyId,
            name: actionData.name,
            quantity: actionData.quantity || 1,
            unit: actionData.unit || null,
            category: actionData.category || null,
            purchased: false,
            createdBy: req.auth!.userId,
          });
          result = { success: true, message: language === "it" ? "Prodotto aggiunto alla lista" : "Item added to list", data: item };
          break;
        }

        case "add_shopping_items": {
          const items = actionData.items as Array<{ name: string; quantity?: number; unit?: string; category?: string }>;
          if (!items || !Array.isArray(items) || items.length === 0) {
            result = { success: false, message: language === "it" ? "Nessun prodotto specificato" : "No items specified" };
            break;
          }
          const createdItems = [];
          for (const item of items) {
            const created = await storage.createShoppingItem({
              familyId: req.auth!.familyId,
              name: item.name,
              quantity: item.quantity || 1,
              unit: item.unit || null,
              category: item.category || null,
              purchased: false,
              createdBy: req.auth!.userId,
            });
            createdItems.push(created);
          }
          result = { 
            success: true, 
            message: language === "it" 
              ? `${createdItems.length} prodotti aggiunti alla lista` 
              : `${createdItems.length} items added to list`, 
            data: createdItems 
          };
          break;
        }

        case "update_shopping":
        case "update_shopping_item": {
          const updated = await storage.updateShoppingItem(actionData.id, req.auth!.familyId, {
            name: actionData.name,
            quantity: actionData.quantity,
            unit: actionData.unit,
            category: actionData.category,
            purchased: actionData.purchased,
          });
          result = { success: !!updated, message: language === "it" ? "Prodotto aggiornato" : "Item updated", data: updated };
          break;
        }

        case "delete_shopping":
        case "delete_shopping_item":
        case "remove_shopping": {
          const deleted = await storage.deleteShoppingItem(actionData.id, req.auth!.familyId);
          result = { success: deleted, message: language === "it" ? "Prodotto rimosso dalla lista" : "Item removed from list" };
          break;
        }

        default:
          result = { success: false, message: language === "it" ? "Azione non supportata" : "Action not supported" };
      }

      try {
        const detailsStr = JSON.stringify({ actionData, success: result.success }).slice(0, 5000);
        await storage.createAuditLog({
          familyId: req.auth!.familyId,
          userId: req.auth!.userId,
          action: actionType,
          details: detailsStr,
          source: "assistant",
        });
      } catch (auditErr) {
        console.error("Audit log error:", auditErr);
      }

      if (conversationId && result.success) {
        await storage.createAssistantMessage({
          conversationId,
          role: "assistant",
          content: `✅ ${result.message}`,
          attachments: null,
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Confirm action error:", error);
      res.status(500).json({ error: "Failed to execute action" });
    }
  };

  app.post("/api/assistant/confirm-action", authMiddleware, handleConfirmAction);
  app.post("/api/assistant/confirm", authMiddleware, handleConfirmAction);

  app.post("/api/assistant/uploads", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const contentType = req.headers["content-type"] || "";
      
      if (!contentType.includes("multipart/form-data")) {
        return res.status(400).json({ error: "Content-Type must be multipart/form-data" });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);

      const boundary = contentType.split("boundary=")[1];
      if (!boundary) {
        return res.status(400).json({ error: "Invalid multipart boundary" });
      }

      const parts = body.toString("binary").split(`--${boundary}`);
      let filename = "";
      let mimeType = "";
      let fileData: Buffer | null = null;

      for (const part of parts) {
        if (part.includes("Content-Disposition")) {
          const filenameMatch = part.match(/filename="([^"]+)"/);
          const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
          
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
          if (contentTypeMatch) {
            mimeType = contentTypeMatch[1].trim();
          }

          const dataStart = part.indexOf("\r\n\r\n");
          if (dataStart !== -1) {
            const rawData = part.slice(dataStart + 4);
            const cleanData = rawData.replace(/\r\n--$/, "").replace(/--$/, "");
            fileData = Buffer.from(cleanData, "binary");
          }
        }
      }

      if (!filename || !fileData) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const ext = path.extname(filename);
      const storedFilename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const filePath = path.join(uploadsDir, storedFilename);
      fs.writeFileSync(filePath, fileData);

      let extractedText: string | null = null;
      let analysisResult: { type: string; data: Record<string, unknown>; suggestedActions: string[] } | null = null;

      if (mimeType === "text/plain" || mimeType === "text/csv") {
        extractedText = fileData.toString("utf-8").slice(0, 10000);
      }

      if (mimeType.startsWith("image/")) {
        try {
          const base64Image = fileData.toString("base64");
          const imageUrl = `data:${mimeType};base64,${base64Image}`;
          
          const visionResponse = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            max_completion_tokens: 1024,
            messages: [
              {
                role: "system",
                content: `Sei un assistente specializzato nell'analisi di documenti per un'app familiare. Analizza l'immagine e restituisci SOLO un JSON valido con questa struttura:
{
  "type": "receipt|invoice|school_document|fine|generic_document|photo",
  "data": {
    "title": "titolo o descrizione",
    "amount": numero o null,
    "date": "YYYY-MM-DD" o null,
    "category": "food|transport|health|education|utilities|entertainment|shopping|other",
    "items": ["lista prodotti se scontrino"],
    "vendor": "nome negozio/ente",
    "notes": "note aggiuntive"
  },
  "suggestedActions": ["create_expense", "create_event", "create_task"]
}

Analizza scontrini, fatture, bollette, documenti scolastici, multe. Per ogni tipo suggerisci le azioni appropriate.`
              },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: imageUrl } },
                  { type: "text", text: "Analizza questo documento e estrai le informazioni strutturate." }
                ]
              }
            ],
          });

          const visionContent = visionResponse.choices[0]?.message?.content || "";
          const jsonMatch = visionContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysisResult = JSON.parse(jsonMatch[0]);
            extractedText = JSON.stringify(analysisResult, null, 2);
          }
        } catch (visionError) {
          console.error("Vision analysis error:", visionError);
        }
      }

      const upload = await storage.createAssistantUpload({
        familyId: req.auth!.familyId,
        userId: req.auth!.userId,
        filename: storedFilename,
        originalName: filename,
        mimeType,
        size: fileData.length,
        extractedText,
      });

      res.status(201).json({
        id: upload.id,
        filename: upload.originalName,
        mimeType: upload.mimeType,
        size: upload.size,
        hasExtractedText: !!upload.extractedText,
        analysis: analysisResult,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/api/assistant/uploads/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const upload = await storage.getAssistantUpload(req.params.id, req.auth!.familyId);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found" });
      }

      const filePath = path.join(uploadsDir, upload.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader("Content-Type", upload.mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${upload.originalName}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error("Get upload error:", error);
      res.status(500).json({ error: "Failed to get file" });
    }
  });
}
