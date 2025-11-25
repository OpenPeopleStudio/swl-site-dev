import { setupServer } from "msw/node";
import { ownerHandlers } from "@/mocks/owner";
import { sharedHandlers } from "@/mocks/shared/handlers";
import { staffHandlers } from "@/mocks/staff";

const allHandlers = [...sharedHandlers, ...ownerHandlers, ...staffHandlers];

export const server = setupServer(...allHandlers);

