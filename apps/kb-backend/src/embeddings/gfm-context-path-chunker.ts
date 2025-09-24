import type {
  Heading,
  List,
  ListItem,
  Node,
  Root,
  Table,
  TableCell,
  TableRow,
} from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown, gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { toString as mdastToString } from "mdast-util-to-string";
import { gfm } from "micromark-extension-gfm";
import { splitGraphemes } from "text-segmentation";
import { countWords, estimateEmbeddingTokenCount } from "../utils/counter.js";

interface HeaderPath {
  path: string[];
  level: number;
}

interface SectionContext {
  currentHeader: string | null;
  parentList: string | null;
  tableHeader: string | null;
  depth: number;
}

interface ChunkContext {
  headerPath: HeaderPath;
  sectionContext: SectionContext;
  buffer: Node[];
  wordCount: number;
  tokenCount: number;
  chunks: string[];
}
export interface ChunkerOptions {
  maxTokensPerChunk?: number;
  maxWordsPerChunk?: number;
  maxWordsHeader?: number;
  pathSeparator?: string;
}

const DEFAULT_OPTIONS: Required<ChunkerOptions> = {
  maxTokensPerChunk: 512,
  maxWordsPerChunk: 100,
  maxWordsHeader: 45,
  pathSeparator: " > ",
};

export class GFMContextPathChunker {
  private readonly options: Required<ChunkerOptions>;

  constructor(options: ChunkerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  public chunk(input: string | Root, pageTitle: string): string[] {
    if (!input || (typeof input === "string" && !input.trim())) {
      return [];
    }

    try {
      const tree: Root =
        typeof input === "string" ? this.parseFromMarkdown(input) : input;

      if (!tree?.children?.length) {
        return [];
      }

      const context = this.processNode(
        tree,
        this.createInitialContext(pageTitle),
      );
      const finalContext = this.finalizeChunks(context);

      return finalContext.chunks.filter(
        (chunk): chunk is string =>
          chunk !== null &&
          chunk !== undefined &&
          typeof chunk === "string" &&
          chunk.trim().length > 0,
      );
    } catch (error) {
      console.error("Error during chunking:", error);
      return [];
    }
  }

  public chunkWithinTokenLimit(
    input: string | Root,
    pageTitle: string,
    maxTokensPerBatch: number,
    overlap = 1,
  ): string[][] {
    // First get all chunks normally
    const allChunks = this.chunk(input, pageTitle);
    if (allChunks.length === 0) return [];

    // Validate no single chunk exceeds limit (safety check)
    const chunkTokens = allChunks.map((chunk) =>
      estimateEmbeddingTokenCount(chunk),
    );
    const maxChunkTokens = Math.max(...chunkTokens);
    if (maxChunkTokens > maxTokensPerBatch) {
      throw new Error(
        `Individual chunk exceeds token limit: ${maxChunkTokens} > ${maxTokensPerBatch}`,
      );
    }

    const batches: string[][] = [];
    let currentIndex = 0;

    while (currentIndex < allChunks.length) {
      let batchTokens = 0;
      let batchSize = 0;

      // Find how many chunks we can include in this batch
      while (
        currentIndex + batchSize < allChunks.length &&
        batchTokens + chunkTokens[currentIndex + batchSize]! <=
          maxTokensPerBatch
      ) {
        batchTokens += chunkTokens[currentIndex + batchSize]!;
        batchSize++;
      }

      // Create the batch with the maximum chunks possible
      const batch = allChunks.slice(currentIndex, currentIndex + batchSize);
      batches.push(batch);

      // Move index forward, accounting for overlap
      // If we're not at the last batch, move forward by batchSize - overlap
      // If we are at the last batch, just finish
      if (currentIndex + batchSize < allChunks.length) {
        currentIndex += Math.max(1, batchSize - overlap);
      } else {
        break;
      }
    }

    return batches;
  }

  private parseFromMarkdown(markdown: string): Root {
    return fromMarkdown(markdown, null, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    });
  }

  private createInitialContext(pageTitle: string): ChunkContext {
    return {
      headerPath: { path: pageTitle ? [pageTitle] : [], level: 0 },
      sectionContext: {
        currentHeader: null,
        parentList: null,
        tableHeader: null,
        depth: 0,
      },
      buffer: [],
      wordCount: 0,
      tokenCount: 0,
      chunks: [],
    };
  }

  private processNode(node: Node, context: ChunkContext): ChunkContext {
    try {
      context = this.updateSectionContext(node, context);

      if (this.isHeading(node)) {
        return this.handleHeading(node, context);
      }

      if (this.isTable(node)) {
        return this.handleTable(node, context);
      }

      if (this.isList(node)) {
        return this.handleList(node, context);
      }

      if (this.isBlockElement(node)) {
        return this.handleBlock(node, context);
      }

      if (this.isParent(node)) {
        return node.children.reduce(
          (acc, child) => this.processNode(child as Node, acc),
          context,
        );
      }

      return this.addToBuffer(node, context);
    } catch (error) {
      console.error("Error processing node:", error);
      return context;
    }
  }

  private handleTable(node: Table, context: ChunkContext): ChunkContext {
    const rows = node.children;
    if (!rows.length) return context;

    const headerRow = rows[0] as TableRow;
    const headerCells = headerRow.children;
    const maxCellsPerChunk = Math.max(2, Math.floor(headerCells.length / 2));

    let currentContext = context;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex] as TableRow;
      const cells = row.children;

      if (rowIndex === 0 || !this.isRowTooLong(row)) {
        const tableChunk: Table = {
          ...node,
          children: [headerRow, row].filter(
            (r, i) => rowIndex === 0 || i === 1,
          ),
        };
        currentContext = this.handleBlock(tableChunk, currentContext);
        continue;
      }

      const cellChunks = this.splitRowIntoCellChunks(cells, maxCellsPerChunk);

      for (let i = 0; i < cellChunks.length; i++) {
        const cellChunk = cellChunks[i];
        const correspondingHeaderCells = headerCells.slice(
          i * maxCellsPerChunk,
          Math.min((i + 1) * maxCellsPerChunk, headerCells.length),
        );

        const chunkHeaderRow: TableRow = {
          ...headerRow,
          children: correspondingHeaderCells,
        };

        const chunkDataRow: TableRow = {
          ...row,
          children: cellChunk as TableCell[],
        };

        if (i > 0) {
          const noteCell = this.createNoteCell(
            "(Continued from previous section)",
          );
          chunkHeaderRow.children = [noteCell, ...chunkHeaderRow.children];
          chunkDataRow.children = [
            this.createNoteCell("..."),
            ...chunkDataRow.children,
          ];
        }

        const tableChunk: Table = {
          ...node,
          children: [chunkHeaderRow, chunkDataRow],
        };

        currentContext = this.handleBlock(tableChunk, currentContext);
      }
    }

    return currentContext;
  }

  private handleList(node: List, context: ChunkContext): ChunkContext {
    const items = node.children;
    if (!items.length) return context;

    // Check if the entire list fits in one chunk
    const listText = mdastToString(node);
    const listWords = countWords(listText);
    const listTokens = estimateEmbeddingTokenCount(listText);

    // If the whole list fits in one chunk, process it as a single block
    if (
      listWords <= this.options.maxWordsPerChunk &&
      listTokens <= this.options.maxTokensPerChunk
    ) {
      return this.handleBlock(node, context);
    }

    // If we need to split it, create a parent context that will be reused
    const parentContext = { ...context };
    let updatedContext = parentContext;

    // Process list items in batches to form coherent chunks
    let currentChunk: ListItem[] = [];
    let currentWords = 0;
    let currentTokens = 0;

    for (const item of items) {
      const itemText = mdastToString(item);
      const itemWords = countWords(itemText);
      const itemTokens = estimateEmbeddingTokenCount(itemText);

      // If adding this item would exceed limits, finalize current chunk
      if (
        currentChunk.length > 0 &&
        (currentWords + itemWords > this.options.maxWordsPerChunk ||
          currentTokens + itemTokens > this.options.maxTokensPerChunk)
      ) {
        // Create a list chunk with accumulated items
        const listChunk: List = {
          ...node,
          children: currentChunk,
        };

        // Process this chunk without creating redundant header paths
        updatedContext = this.addToBuffer(listChunk, updatedContext);

        // Start a new chunk with this item
        currentChunk = [item];
        currentWords = itemWords;
        currentTokens = itemTokens;
      } else {
        // Add item to current chunk
        currentChunk.push(item);
        currentWords += itemWords;
        currentTokens += itemTokens;
      }

      // Handle nested lists separately if needed
    }

    // Process any remaining items
    if (currentChunk.length > 0) {
      const listChunk: List = {
        ...node,
        children: currentChunk,
      };
      updatedContext = this.addToBuffer(listChunk, updatedContext);
    }

    // Finalize all chunks with header path applied only once
    return this.finalizeChunks(updatedContext);
  }

  private handleHeading(node: Heading, context: ChunkContext): ChunkContext {
    const cleanContext = this.finalizeChunks(context);
    const headingText = mdastToString(node);
    const level = node.depth;

    const newPath = cleanContext.headerPath.path.slice(0, level - 1);
    newPath.push(headingText);

    const isSignificant =
      countWords(headingText) >= 4 ||
      level === 1 ||
      headingText.includes("?") ||
      /^\d+[.)]\s/.test(headingText);

    const hasExistingContent = cleanContext.buffer.length > 0;
    const shouldCreateChunk = hasExistingContent || isSignificant;

    return {
      ...cleanContext,
      headerPath: {
        path: newPath,
        level,
      },
      buffer: shouldCreateChunk ? [node] : [],
      wordCount: shouldCreateChunk ? countWords(headingText) : 0,
      tokenCount: shouldCreateChunk
        ? estimateEmbeddingTokenCount(headingText)
        : 0,
    };
  }

  private handleBlock(node: Node, context: ChunkContext): ChunkContext {
    if (!node) return context;

    const blockText = mdastToString(node);
    if (!blockText) return context;

    const blockWords = countWords(blockText);
    const blockTokens = estimateEmbeddingTokenCount(blockText);

    if (
      context.tokenCount + blockTokens > this.options.maxTokensPerChunk ||
      context.wordCount + blockWords > this.options.maxWordsPerChunk
    ) {
      const cleanContext = this.finalizeChunks(context);
      return this.finalizeChunks({
        ...cleanContext,
        buffer: [node],
        wordCount: blockWords,
        tokenCount: blockTokens,
      });
    }

    return {
      ...context,
      buffer: [...context.buffer, node],
      wordCount: context.wordCount + blockWords,
      tokenCount: context.tokenCount + blockTokens,
    };
  }

  private isRowTooLong(row: TableRow): boolean {
    const rowText = mdastToString(row);
    const rowWords = countWords(rowText);
    const rowTokens = estimateEmbeddingTokenCount(rowText);

    return (
      rowWords > this.options.maxWordsPerChunk ||
      rowTokens > this.options.maxTokensPerChunk
    );
  }

  private splitRowIntoCellChunks(
    cells: Node[],
    maxCellsPerChunk: number,
  ): Node[][] {
    const chunks: Node[][] = [];
    let currentChunk: Node[] = [];
    let currentWords = 0;
    let currentTokens = 0;

    for (const cell of cells) {
      const cellText = mdastToString(cell);
      const cellWords = countWords(cellText);
      const cellTokens = estimateEmbeddingTokenCount(cellText);

      if (
        cellWords > this.options.maxWordsPerChunk ||
        cellTokens > this.options.maxTokensPerChunk
      ) {
        if (currentChunk.length > 0) {
          chunks.push([...currentChunk]);
          currentChunk = [];
          currentWords = 0;
          currentTokens = 0;
        }
        chunks.push([cell]);
        continue;
      }

      if (
        currentChunk.length >= maxCellsPerChunk ||
        currentWords + cellWords > this.options.maxWordsPerChunk ||
        currentTokens + cellTokens > this.options.maxTokensPerChunk
      ) {
        chunks.push([...currentChunk]);
        currentChunk = [cell];
        currentWords = cellWords;
        currentTokens = cellTokens;
      } else {
        currentChunk.push(cell);
        currentWords += cellWords;
        currentTokens += cellTokens;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private createNoteCell(text: string): TableCell {
    return {
      type: "tableCell",
      children: [
        {
          type: "text",
          value: text,
        },
      ],
    };
  }

  private finalizeChunks(context: ChunkContext): ChunkContext {
    if (!context.buffer?.length) {
      return context;
    }

    const emptyContext: ChunkContext = {
      ...context,
      buffer: [],
      wordCount: 0,
      tokenCount: 0,
    };

    const validBuffer = context.buffer.filter(
      (node): node is Node =>
        node && typeof node === "object" && "type" in node,
    );

    if (!validBuffer.length) {
      return emptyContext;
    }

    try {
      const root = {
        type: "root",
        children: validBuffer as Root["children"],
      };
      const content = mdastToString(root);

      if (!content) {
        return emptyContext;
      }

      const chunk = this.createChunk(validBuffer, context.headerPath.path);
      if (!chunk) {
        return emptyContext;
      }

      const chunkTokens = estimateEmbeddingTokenCount(chunk);
      if (chunkTokens > this.options.maxTokensPerChunk) {
        const splitChunks = this.splitLargeNode(chunk);
        return {
          ...emptyContext,
          chunks: [...context.chunks, ...splitChunks],
        };
      }

      return {
        ...emptyContext,
        chunks: [...context.chunks, chunk],
      };
    } catch (error) {
      console.error("Error finalizing chunks:", error);
      return emptyContext;
    }
  }

  private splitLargeNode(text: string): string[] {
    const chunks: string[] = [];
    let currentChunk = "";
    let currentTokens = 0;

    const graphemes = [...splitGraphemes(text)];

    for (const grapheme of graphemes) {
      const graphemeTokens = estimateEmbeddingTokenCount(grapheme);

      if (currentTokens + graphemeTokens > this.options.maxTokensPerChunk) {
        let splitIndex = currentChunk.length;
        const breakPoints = [". ", "? ", "! ", ", ", "; ", " "];

        for (const breakPoint of breakPoints) {
          const lastBreak = currentChunk.lastIndexOf(breakPoint);
          if (lastBreak !== -1) {
            splitIndex = lastBreak + breakPoint.length;
            break;
          }
        }

        if (splitIndex < currentChunk.length) {
          chunks.push(currentChunk.slice(0, splitIndex).trim());
          currentChunk = currentChunk.slice(splitIndex);
          currentTokens = estimateEmbeddingTokenCount(currentChunk);
        } else {
          chunks.push(currentChunk.trim());
          currentChunk = "";
          currentTokens = 0;
        }
      }

      currentChunk += grapheme;
      currentTokens += graphemeTokens;
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  private createChunk(nodes: Node[], headerPath: string[]): string | null {
    if (!nodes?.length) {
      return null;
    }

    const validNodes = nodes.filter(
      (node): node is Node =>
        node && typeof node === "object" && "type" in node,
    );

    if (!validNodes.length) {
      return null;
    }

    try {
      const content = toMarkdown(
        { type: "root", children: validNodes as Root["children"] },
        {
          extensions: [gfmToMarkdown()],
          rule: "-",
          strong: "*",
          emphasis: "_",
        },
      );

      if (!content?.trim()) {
        return null;
      }

      const cleanedContent = content
        .trim()
        .split("\n")
        .map((line: string) => {
          line = line.trim();
          if (/^\|[-\s|]+\|$/.exec(line)) {
            const columnCount = (line.match(/\|/g) ?? []).length - 1;
            return "|" + " --- |".repeat(columnCount);
          }
          return line.replace(/\|(\s+)\|/g, "| |").replace(/----+/g, "---");
        })
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\| +/g, "| ")
        .replace(/ +\|/g, " |")
        .replace(/([^|])\|([^|])/g, "$1 | $2");

      if (!cleanedContent) {
        return null;
      }

      const formattedPath = this.formatHeaderPath(headerPath);
      return formattedPath
        ? `${formattedPath}\n\n${cleanedContent}`
        : cleanedContent;
    } catch (error) {
      console.error("Error creating chunk:", error);
      return null;
    }
  }

  private formatHeaderPath(path: string[]): string {
    if (!path.length) return "";

    const fullPath = path.join(this.options.pathSeparator);
    const words = countWords(fullPath);

    if (words > this.options.maxWordsHeader) {
      const start = path.slice(0, 1);
      const end = path.slice(-2);
      return [...start, "...", ...end].join(this.options.pathSeparator);
    }

    return fullPath;
  }

  private updateSectionContext(
    node: Node,
    context: ChunkContext,
  ): ChunkContext {
    const newContext = { ...context };

    if (this.isHeading(node)) {
      newContext.sectionContext.currentHeader = mdastToString(node);
      newContext.sectionContext.depth = node.depth;
    } else if (this.isTable(node)) {
      const firstRow = node.children[0] as TableRow;
      if (firstRow) {
        newContext.sectionContext.tableHeader = mdastToString(firstRow);
      }
    } else if (this.isList(node)) {
      const listMarker = node.ordered ? "1. " : "• ";
      newContext.sectionContext.parentList = listMarker;
    }

    return newContext;
  }

  private isHeading(node: Node): node is Heading {
    return node.type === "heading";
  }

  private isTable(node: Node): node is Table {
    return node.type === "table";
  }

  private isList(node: Node): node is List {
    return node.type === "list";
  }

  private isBlockElement(node: Node): boolean {
    return (
      node.type === "table" ||
      node.type === "tableRow" ||
      (node.type === "list" &&
        "checked" in ((node as List).children[0] as ListItem))
    );
  }

  private isParent(node: Node): node is Root {
    return "children" in node;
  }

  private addToBuffer(node: Node, context: ChunkContext): ChunkContext {
    const text = mdastToString(node);
    const words = countWords(text);
    const tokens = estimateEmbeddingTokenCount(text);

    if (
      context.wordCount + words > this.options.maxWordsPerChunk ||
      context.tokenCount + tokens > this.options.maxTokensPerChunk
    ) {
      const cleanContext = this.finalizeChunks(context);
      return {
        ...cleanContext,
        buffer: [node],
        wordCount: words,
        tokenCount: tokens,
      };
    }

    return {
      ...context,
      buffer: [...context.buffer, node],
      wordCount: context.wordCount + words,
      tokenCount: context.tokenCount + tokens,
    };
  }
}
