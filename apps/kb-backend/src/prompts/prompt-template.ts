/**
 * A lightweight utility for template-based prompt generation with variable substitution
 */
export class PromptTemplate<
  RequiredVars extends Record<string, unknown> = Record<string, unknown>,
> {
  private template: string;
  private variablePattern: RegExp;
  private hasVariables: boolean;

  /**
   * Creates a new prompt template with variable placeholders
   * @param template - String template with variable placeholders
   * @param pattern - RegExp pattern to identify variables (defaults to {{varName}})
   */
  constructor(template: string, pattern?: RegExp) {
    this.template = template;
    this.variablePattern = pattern ?? /\{\{([^{}]+)\}\}/g;
    // Check if template contains any variables
    this.hasVariables = this.variablePattern.test(template);
    // Reset pattern for future use
    this.variablePattern.lastIndex = 0;
  }

  /**
   * Formats the template by replacing variables
   * @param variables - Object containing values to substitute into the template
   * @returns Formatted string with all variables replaced
   */
  format(): string;
  format(variables: RequiredVars): string;
  format(variables?: RequiredVars): string {
    // If no variables needed, allow empty call
    if (!this.hasVariables) {
      return this.template;
    }

    // Require variables if template has placeholders
    if (!variables) {
      throw new Error("Variables are required for this template");
    }

    // Reset the regex lastIndex
    this.variablePattern.lastIndex = 0;

    return this.template.replace(this.variablePattern, (match, varPath) => {
      // Support for accessing nested properties using dot notation (e.g., {{user.name}})
      const path = varPath.trim().split(".");
      let value: unknown = variables;

      for (const key of path) {
        if (value === undefined || value === null) {
          throw new Error(
            `Variable '${varPath}' is undefined in the provided data`,
          );
        }
        value = (value as Record<string, unknown>)[key];
      }

      if (value === undefined || value === null) {
        throw new Error(
          `Variable '${varPath}' is undefined in the provided data`,
        );
      }

      // Stringify complex objects that aren't strings or numbers
      if (typeof value !== "string" && typeof value !== "number") {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  /**
   * Creates a type-safe PromptTemplate from a string template
   * @param template - String template with {{variableName}} placeholders
   * @returns A new PromptTemplate instance with inferred variable types
   */
  static create<T extends Record<string, unknown>>(
    template: string,
  ): PromptTemplate<T> {
    return new PromptTemplate<T>(template);
  }

  /**
   * Creates a type-safe template with custom variable pattern
   * @param template - String template with variable placeholders
   * @param pattern - RegExp pattern to identify variables
   * @returns A new PromptTemplate instance with inferred variable types
   */
  static withPattern<T extends Record<string, unknown>>(
    template: string,
    pattern: RegExp,
  ): PromptTemplate<T> {
    return new PromptTemplate<T>(template, pattern);
  }
}
