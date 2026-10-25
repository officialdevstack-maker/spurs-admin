import "server-only";
import { resolveConfig } from "@/lib/credentials";

export type SettingValue = boolean | number | string;
export type SettingType = "bool" | "int" | "string" | "text" | "methods" | "assets";

export interface SettingDefinition<T extends SettingType = SettingType> {
  key: string;
  group: string;
  label: string;
  type: T;
  default: string;
  help: string;
  secret?: boolean;
}

export interface SettingCatalogItem {
  key: string;
  label: string;
  type: SettingType;
  value: SettingValue;
  default: SettingValue;
  help: string;
  secret?: boolean;
}

export type SettingsCatalog = Record<string, SettingCatalogItem[]>;

function cast(raw: string | undefined, type: SettingType, fallback: string): SettingValue {
  const value = raw ?? fallback;
  if (type === "bool") return value === "true" || value === "1" || value === "on";
  if (type === "int") return Number(value) || 0;
  return value;
}

export async function buildSettingsCatalog(
  appId: string,
  definitions: readonly SettingDefinition[],
): Promise<SettingsCatalog> {
  const config = await resolveConfig(appId);
  const catalog: SettingsCatalog = {};

  for (const definition of definitions) {
    (catalog[definition.group] ??= []).push({
      key: definition.key,
      label: definition.label,
      type: definition.type,
      value: definition.secret ? "" : cast(config[definition.key], definition.type, definition.default),
      default: cast(undefined, definition.type, definition.default),
      help: definition.help,
      secret: definition.secret,
    });
  }

  return catalog;
}
