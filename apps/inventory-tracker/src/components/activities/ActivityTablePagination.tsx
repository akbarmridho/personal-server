import type { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActivityTablePaginationProps {
  table: Table<any>;
  currentPage: number;
  totalPages: number;
  currentPageItems: number;
  totalItems: number;
}

export function ActivityTablePagination({
  table,
  currentPage,
  totalPages,
  currentPageItems,
  totalItems,
}: ActivityTablePaginationProps) {
  // Show pagination if there's data or if there are multiple pages
  const shouldShowPagination = totalPages > 0 || table.getFilteredRowModel().rows.length > 0;
  
  if (!shouldShowPagination) return null;

  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        Menampilkan {currentPageItems} dari {totalItems} aktivitas
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-sm font-medium">Baris per halaman</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Halaman {currentPage} dari {totalPages || 1}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Ke halaman pertama</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Ke halaman sebelumnya</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Ke halaman selanjutnya</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex((table.getPageCount() || 1) - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Ke halaman terakhir</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}