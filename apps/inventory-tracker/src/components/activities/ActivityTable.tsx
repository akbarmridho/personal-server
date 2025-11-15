import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Search, Settings } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS, PAGINATION } from "@/lib/constants";
import { formatCurrency } from "@/lib/date-utils";
import type { QueryParams } from "@/types/api";
import type { ProductActivityWithRelations } from "@/types/database";
import { useActivities } from "@/hooks/useActivities";
import { activityColumns } from "./ActivityTableColumns";
import { ActivityTablePagination } from "./ActivityTablePagination";

interface ActivityTableProps {
  isLoading?: boolean;
}

interface GroupedActivity {
  id: string;
  type: "transaction" | "single";
  transaction_id?: number;
  activities: ProductActivityWithRelations[];
  created_at: string;
  total_value: number;
  notes?: string;
}

export function ActivityTable({
  isLoading: propIsLoading,
}: ActivityTableProps) {
  const [params, setParams] = useState<QueryParams>({
    page: 1,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    sort: { column: "created_at", direction: "desc" },
    filter: { search: "" },
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    created_at: true,
    product_name: true,
    variant_name: true,
    type: true,
    quantity: true,
    unit_price: true,
    total_value: true,
    notes: true,
    actions: true,
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const {
    activities,
    isLoading,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    error,
  } = useActivities(params);

  // Transform activities data for table with grouping
  const groupedData: GroupedActivity[] = React.useMemo(() => {
    if (!activities) return [];

    const grouped: Record<string, ProductActivityWithRelations[]> = {};
    
    // Group activities by transaction_id
    activities.forEach((activity: ProductActivityWithRelations) => {
      const key = activity.transaction_id 
        ? `tx-${activity.transaction_id}` 
        : `single-${activity.id}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(activity);
    });

    // Transform to table format
    return Object.entries(grouped).map(([key, groupActivities]) => {
      const isTransaction = key.startsWith('tx-');
      const firstActivity = groupActivities[0];
      
      // Calculate total value for the group
      const totalValue = groupActivities.reduce(
        (sum, activity) =>
          sum +
          (activity.type === "Sales" || activity.type === "Refund"
            ? activity.quantity * activity.unit_revenue + activity.revenue_adjustment
            : activity.quantity * activity.unit_cost + activity.cost_adjustment),
        0,
      );

      return {
        id: key,
        type: isTransaction ? "transaction" : "single",
        transaction_id: firstActivity.transaction_id || undefined,
        activities: groupActivities,
        created_at: firstActivity.created_at,
        total_value: totalValue,
        notes: firstActivity.transactions?.notes || firstActivity.notes || undefined,
      };
    });
  }, [activities]);

  // Set default expanded state for transactions
  useEffect(() => {
    const defaultExpanded: Record<string, boolean> = {};
    groupedData.forEach((item) => {
      if (item.type === "transaction") {
        defaultExpanded[item.id] = true; // Default expanded for transactions
      }
    });
    setExpanded(defaultExpanded);
  }, [groupedData]);

  // Show error toast when there's a data loading error
  useEffect(() => {
    if (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memuat aktivitas",
      );
    }
  }, [error]);

  const handleSearchChange = (search: string) => {
    setParams((prev) => ({
      ...prev,
      filter: { ...prev.filter, search },
      page: 1,
    }));
  };

  const handleActivityTypeChange = (activityTypes: string) => {
    if (activityTypes === "all") {
      setParams((prev) => ({
        ...prev,
        filter: { ...prev.filter, activityTypes: undefined },
        page: 1,
      }));
    } else {
      setParams((prev) => ({
        ...prev,
        filter: { ...prev.filter, activityTypes: [activityTypes] },
        page: 1,
      }));
    }
  };

  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const newSorting =
      typeof updaterOrValue === "function"
        ? updaterOrValue(sorting)
        : updaterOrValue;

    setSorting(newSorting);

    if (newSorting.length > 0) {
      const { id, desc } = newSorting[0];
      setParams((prev) => ({
        ...prev,
        sort: { column: id, direction: desc ? "desc" : "asc" },
        page: 1,
      }));
    }
  };

  const handlePaginationChange = (page: number, pageSize: number) => {
    setParams((prev) => ({ ...prev, page, pageSize }));
  };

  const table = useReactTable({
    data: groupedData,
    columns: activityColumns({}),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === "function"
          ? updater(table.getState().pagination)
          : updater;
      handlePaginationChange(
        newPagination.pageIndex + 1,
        newPagination.pageSize,
      );
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
      expanded,
    },
    onExpandedChange: (updater) => {
      const newExpanded =
        typeof updater === "function"
          ? updater(table.getState().expanded)
          : updater;
      setExpanded(newExpanded as Record<string, boolean>);
    },
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    getRowCanExpand: (row) => {
      return row.original.type === "transaction" && row.original.activities.length > 1;
    },
  });

  if (isLoading || propIsLoading) {
    return <div className="text-center py-8">Memuat data...</div>;
  }

  if (!groupedData || groupedData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Belum ada aktivitas
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari aktivitas..."
              value={params.filter?.search || ""}
              onChange={(event) => {
                handleSearchChange(event.target.value);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={params.filter?.activityTypes?.[0] || "all"}
            onValueChange={handleActivityTypeChange}
          >
            <SelectTrigger className="w-[200px] cursor-pointer">
              <SelectValue placeholder="Filter Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value={ACTIVITY_TYPES.SALES}>
                {ACTIVITY_TYPE_LABELS.Sales}
              </SelectItem>
              <SelectItem value={ACTIVITY_TYPES.RESTOCK}>
                {ACTIVITY_TYPE_LABELS.Restock}
              </SelectItem>
              <SelectItem value={ACTIVITY_TYPES.REFUND}>
                {ACTIVITY_TYPE_LABELS.Refund}
              </SelectItem>
              <SelectItem value={ACTIVITY_TYPES.ADJUSTMENT}>
                {ACTIVITY_TYPE_LABELS.Adjustment}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings />
                <span className="hidden sm:inline ml-2">Kustomisasi Kolom</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id === "created_at"
                      ? "Tanggal"
                      : column.id === "product_name"
                        ? "Produk"
                        : column.id === "variant_name"
                          ? "Varian"
                          : column.id === "type"
                            ? "Tipe"
                            : column.id === "quantity"
                              ? "Qty"
                              : column.id === "unit_price"
                                ? "Harga"
                                : column.id === "total_value"
                                  ? "Total"
                                  : column.id === "notes"
                                    ? "Catatan"
                                    : column.id === "actions"
                                      ? "Aksi"
                                      : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="text-center text-muted-foreground h-24"
                >
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const item = row.original as GroupedActivity;
                
                return (
                  <React.Fragment key={row.id}>
                    <TableRow data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {row.getIsExpanded() && (
                      <TableRow>
                        <TableCell
                          colSpan={row.getAllCells().length}
                          className="p-0"
                        >
                          <div className="bg-gray-50 p-4">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Produk</TableHead>
                                    <TableHead>Varian</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Harga</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {item.activities.map((activity) => {
                                    const itemTotal =
                                      activity.type === "Sales" || activity.type === "Refund"
                                        ? activity.quantity * activity.unit_revenue +
                                          activity.revenue_adjustment
                                        : activity.quantity * activity.unit_cost +
                                          activity.cost_adjustment;

                                    return (
                                      <TableRow key={activity.id}>
                                        <TableCell>{activity.product_name}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                          {activity.variant_name}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {activity.quantity}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {formatCurrency(
                                            activity.type === "Sales" || activity.type === "Refund"
                                              ? activity.unit_revenue
                                              : activity.unit_cost,
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {formatCurrency(itemTotal)}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {params.filter?.search
                    ? "Tidak ada aktivitas yang ditemukan"
                    : "Belum ada aktivitas"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <ActivityTablePagination
        table={table}
        currentPage={currentPage}
        totalPages={totalPages}
        currentPageItems={groupedData?.length || 0}
        totalItems={totalCount}
      />
    </div>
  );
}