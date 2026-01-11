import { ComponentProps } from "react";
import { Feather } from "@expo/vector-icons";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

export const AppIcons = {
  home: "home" as FeatherIconName,
  calendar: "calendar" as FeatherIconName,
  tasks: "check-square" as FeatherIconName,
  lists: "list" as FeatherIconName,
  shopping: "shopping-cart" as FeatherIconName,
  budget: "dollar-sign" as FeatherIconName,
  assistant: "message-circle" as FeatherIconName,
  notes: "file-text" as FeatherIconName,
  notifications: "bell" as FeatherIconName,
  places: "map-pin" as FeatherIconName,
  family: "users" as FeatherIconName,
  profile: "user" as FeatherIconName,
  settings: "settings" as FeatherIconName,
  
  add: "plus" as FeatherIconName,
  edit: "edit-2" as FeatherIconName,
  delete: "trash-2" as FeatherIconName,
  close: "x" as FeatherIconName,
  check: "check" as FeatherIconName,
  chevronRight: "chevron-right" as FeatherIconName,
  chevronLeft: "chevron-left" as FeatherIconName,
  chevronDown: "chevron-down" as FeatherIconName,
  chevronUp: "chevron-up" as FeatherIconName,
  search: "search" as FeatherIconName,
  filter: "filter" as FeatherIconName,
  refresh: "refresh-cw" as FeatherIconName,
  copy: "copy" as FeatherIconName,
  share: "share" as FeatherIconName,
  send: "send" as FeatherIconName,
  attachment: "paperclip" as FeatherIconName,
  image: "image" as FeatherIconName,
  file: "file" as FeatherIconName,
  
  success: "check-circle" as FeatherIconName,
  error: "alert-circle" as FeatherIconName,
  warning: "alert-triangle" as FeatherIconName,
  info: "info" as FeatherIconName,
  offline: "wifi-off" as FeatherIconName,
  clock: "clock" as FeatherIconName,
  
  weather: "cloud" as FeatherIconName,
  sun: "sun" as FeatherIconName,
  rain: "cloud-rain" as FeatherIconName,
  temperature: "thermometer" as FeatherIconName,
  droplet: "droplet" as FeatherIconName,
  
  logout: "log-out" as FeatherIconName,
  invite: "user-plus" as FeatherIconName,
  language: "globe" as FeatherIconName,
  moon: "moon" as FeatherIconName,
  externalLink: "external-link" as FeatherIconName,
  help: "help-circle" as FeatherIconName,
} as const;

export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  "2xl": 40,
} as const;

export type AppIconName = keyof typeof AppIcons;
export type IconSize = keyof typeof IconSizes;
