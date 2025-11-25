import { setupWorker } from "msw/browser";
import { ownerHandlers } from "@/mocks/owner";
import { sharedHandlers } from "@/mocks/shared/handlers";
import { staffHandlers } from "@/mocks/staff";

const allHandlers = [...sharedHandlers, ...ownerHandlers, ...staffHandlers];

export const worker = setupWorker(...allHandlers);

