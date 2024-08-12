import { name , fallbackName} from "./name.js";

export const greeting = `Hello! ${name || fallbackName}`;
