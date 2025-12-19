/**
 * Note Builder Utilities
 * Simplified note creation with string content
 */

import type { NoteType } from "../modules/noteManager.js";
import type {
  CreateNoteParams,
  SimpleNoteInput,
} from "../types/noteBuilderTypes.js";

/**
 * Build note parameters with string content
 * This is the main factory function that simplifies note creation
 * Handles all note types with string content
 */
export function buildNoteParams(input: SimpleNoteInput): CreateNoteParams {
  const { noteType, content, ...otherParams } = input;

  return {
    ...otherParams,
    type: noteType,
    content: content,
  };
}
