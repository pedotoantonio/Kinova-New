import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Language = "it" | "en";

const translations = {
  it: {
    common: {
      loading: "Caricamento...",
      error: "Errore",
      retry: "Riprova",
      cancel: "Annulla",
      save: "Salva",
      delete: "Elimina",
      edit: "Modifica",
      create: "Crea",
      confirm: "Conferma",
      yes: "Sì",
      no: "No",
      today: "Oggi",
      tomorrow: "Domani",
      yesterday: "Ieri",
    },
    auth: {
      login: "Accedi",
      logout: "Esci",
      register: "Registrati",
      pleaseLogin: "Effettua l'accesso",
    },
    home: {
      title: "Home",
      welcomeTo: "Benvenuto in",
      yourFamily: "La tua Famiglia",
      familyMembers: "Membri della Famiglia",
      noFamilyMembers: "Nessun membro ancora",
      todayEvents: "Oggi",
      noEventsToday: "Nessun impegno oggi",
      viewCalendar: "Vedi calendario",
      member: "membro",
      members: "membri",
      shoppingList: "Lista Spesa",
      nothingToBuy: "Niente da comprare",
      viewShopping: "Vedi lista",
      pendingTasks: "Attività",
      noTasksPending: "Nessuna attività",
      viewTasks: "Vedi attività",
      overdue: "scaduta",
      overdueCount: "{count} scadute",
    },
    calendar: {
      title: "Calendario",
      addEvent: "Aggiungi evento",
      noEvents: "Nessun evento",
      noUpcomingEvents: "Nessun evento in programma",
      eventTitle: "Titolo evento",
      eventDescription: "Descrizione",
      shortCode: "Codice breve",
      shortCodeHint: "Es. MM, CF, AP",
      startDate: "Data inizio",
      endDate: "Data fine",
      allDay: "Tutto il giorno",
      selectColor: "Seleziona colore",
      category: "Categoria",
      assignTo: "Assegna a",
      deleteEvent: "Elimina evento",
      deleteConfirm: "Sei sicuro di voler eliminare questo evento?",
      eventCreated: "Evento creato",
      eventUpdated: "Evento aggiornato",
      eventDeleted: "Evento eliminato",
      titleRequired: "Il titolo è obbligatorio",
      moreEvents: "+{count} altri",
      viewAll: "Vedi tutti",
      sun: "Dom",
      mon: "Lun",
      tue: "Mar",
      wed: "Mer",
      thu: "Gio",
      fri: "Ven",
      sat: "Sab",
      weekend: "Fine settimana",
      months: [
        "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
      ],
      categories: {
        family: "Famiglia",
        course: "Corso",
        shift: "Turno",
        vacation: "Ferie",
        holiday: "Festività",
        other: "Altro",
      },
      recurrence: {
        title: "Ricorrenza",
        none: "Nessuna",
        daily: "Giornaliera",
        weekly: "Settimanale",
        monthly: "Mensile",
        interval: "Ogni",
        days: "giorni",
        weeks: "settimane",
        months: "mesi",
        endDate: "Data fine ricorrenza",
        noEnd: "Senza fine",
      },
      filters: {
        title: "Filtri",
        all: "Tutti",
        byCategory: "Per categoria",
        byMember: "Per membro",
        reset: "Azzera filtri",
        active: "Filtri attivi",
      },
    },
    tasks: {
      title: "Attività",
      addTask: "Aggiungi attività",
      noTasks: "Nessuna attività",
      completed: "Completate",
      pending: "In sospeso",
      overdue: "Scadute",
      all: "Tutte",
      taskTitle: "Titolo attività",
      taskDescription: "Descrizione",
      dueDate: "Scadenza",
      assignTo: "Assegna a",
      priority: "Priorità",
      priorityLow: "Bassa",
      priorityMedium: "Media",
      priorityHigh: "Alta",
      deleteTask: "Elimina attività",
      deleteConfirm: "Sei sicuro di voler eliminare questa attività?",
      markComplete: "Segna come completata",
      markIncomplete: "Segna come da fare",
      noAssignment: "Non assegnata",
      titleRequired: "Il titolo è obbligatorio",
    },
    shopping: {
      title: "Lista spesa",
      addItem: "Aggiungi prodotto",
      noItems: "Niente da comprare",
      nothingToBuy: "Niente da comprare",
      purchased: "Acquistati",
      toBuy: "Da comprare",
      all: "Tutti",
      itemName: "Nome prodotto",
      quantity: "Quantità",
      unit: "Unità",
      category: "Categoria",
      deleteItem: "Elimina prodotto",
      deleteConfirm: "Sei sicuro di voler eliminare questo prodotto?",
      markPurchased: "Segna come acquistato",
      markToBuy: "Segna come da comprare",
      nameRequired: "Il nome è obbligatorio",
    },
    lists: {
      title: "Liste",
      shopping: "Spesa",
      tasks: "Attività",
    },
    profile: {
      title: "Profilo",
      settings: "Impostazioni",
      language: "Lingua",
      theme: "Tema",
      about: "Informazioni",
    },
    family: {
      admin: "Admin",
      member: "Membro",
      child: "Bambino",
      you: "Tu",
    },
    errors: {
      networkError: "Errore di rete",
      serverError: "Errore del server",
      notFound: "Non trovato",
      unauthorized: "Non autorizzato",
      forbidden: "Accesso negato",
      validationError: "Errore di validazione",
    },
  },
  en: {
    common: {
      loading: "Loading...",
      error: "Error",
      retry: "Retry",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      confirm: "Confirm",
      yes: "Yes",
      no: "No",
      today: "Today",
      tomorrow: "Tomorrow",
      yesterday: "Yesterday",
    },
    auth: {
      login: "Login",
      logout: "Logout",
      register: "Register",
      pleaseLogin: "Please log in",
    },
    home: {
      title: "Home",
      welcomeTo: "Welcome to",
      yourFamily: "Your Family",
      familyMembers: "Family Members",
      noFamilyMembers: "No family members yet",
      todayEvents: "Today",
      noEventsToday: "No events today",
      viewCalendar: "View calendar",
      member: "member",
      members: "members",
      shoppingList: "Shopping List",
      nothingToBuy: "Nothing to buy",
      viewShopping: "View list",
      pendingTasks: "Tasks",
      noTasksPending: "No pending tasks",
      viewTasks: "View tasks",
      overdue: "overdue",
      overdueCount: "{count} overdue",
    },
    calendar: {
      title: "Calendar",
      addEvent: "Add event",
      noEvents: "No events",
      noUpcomingEvents: "No upcoming events",
      eventTitle: "Event title",
      eventDescription: "Description",
      shortCode: "Short code",
      shortCodeHint: "E.g. MM, CF, AP",
      startDate: "Start date",
      endDate: "End date",
      allDay: "All day",
      selectColor: "Select color",
      category: "Category",
      assignTo: "Assign to",
      deleteEvent: "Delete event",
      deleteConfirm: "Are you sure you want to delete this event?",
      eventCreated: "Event created",
      eventUpdated: "Event updated",
      eventDeleted: "Event deleted",
      titleRequired: "Title is required",
      moreEvents: "+{count} more",
      viewAll: "View all",
      sun: "Sun",
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
      sat: "Sat",
      weekend: "Weekend",
      months: [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ],
      categories: {
        family: "Family",
        course: "Course",
        shift: "Shift",
        vacation: "Vacation",
        holiday: "Holiday",
        other: "Other",
      },
      recurrence: {
        title: "Recurrence",
        none: "None",
        daily: "Daily",
        weekly: "Weekly",
        monthly: "Monthly",
        interval: "Every",
        days: "days",
        weeks: "weeks",
        months: "months",
        endDate: "Recurrence end date",
        noEnd: "No end",
      },
      filters: {
        title: "Filters",
        all: "All",
        byCategory: "By category",
        byMember: "By member",
        reset: "Reset filters",
        active: "Active filters",
      },
    },
    tasks: {
      title: "Tasks",
      addTask: "Add task",
      noTasks: "No tasks",
      completed: "Completed",
      pending: "Pending",
      overdue: "Overdue",
      all: "All",
      taskTitle: "Task title",
      taskDescription: "Description",
      dueDate: "Due date",
      assignTo: "Assign to",
      priority: "Priority",
      priorityLow: "Low",
      priorityMedium: "Medium",
      priorityHigh: "High",
      deleteTask: "Delete task",
      deleteConfirm: "Are you sure you want to delete this task?",
      markComplete: "Mark as complete",
      markIncomplete: "Mark as incomplete",
      noAssignment: "Unassigned",
      titleRequired: "Title is required",
    },
    shopping: {
      title: "Shopping list",
      addItem: "Add item",
      noItems: "Nothing to buy",
      nothingToBuy: "Nothing to buy",
      purchased: "Purchased",
      toBuy: "To buy",
      all: "All",
      itemName: "Item name",
      quantity: "Quantity",
      unit: "Unit",
      category: "Category",
      deleteItem: "Delete item",
      deleteConfirm: "Are you sure you want to delete this item?",
      markPurchased: "Mark as purchased",
      markToBuy: "Mark as to buy",
      nameRequired: "Name is required",
    },
    lists: {
      title: "Lists",
      shopping: "Shopping",
      tasks: "Tasks",
    },
    profile: {
      title: "Profile",
      settings: "Settings",
      language: "Language",
      theme: "Theme",
      about: "About",
    },
    family: {
      admin: "Admin",
      member: "Member",
      child: "Child",
      you: "You",
    },
    errors: {
      networkError: "Network error",
      serverError: "Server error",
      notFound: "Not found",
      unauthorized: "Unauthorized",
      forbidden: "Access denied",
      validationError: "Validation error",
    },
  },
} as const;

type DeepStringify<T> = T extends readonly string[]
  ? readonly string[]
  : T extends object
  ? { [K in keyof T]: DeepStringify<T[K]> }
  : T extends string
  ? string
  : T;

type TranslationKeys = DeepStringify<typeof translations["it"]>;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: TranslationKeys;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "@kinova/language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("it");
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "en" || stored === "it") {
        setLanguageState(stored);
      }
      setIsLoaded(true);
    });
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language] as TranslationKeys,
  };

  if (!isLoaded) {
    return null;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function useTranslation() {
  const { t, language } = useI18n();
  return { t, language };
}
