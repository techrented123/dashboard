import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface PaginationProps {
  currentPage: number;
  hasNextPage: boolean;
  itemCount: number;
  limit: number;
  onPageChange: (page: number, lastEvaluatedKey?: string) => void;
  isLoading?: boolean;
  totalItems?: number; // Add total items for better tracking
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  hasNextPage,
  itemCount,
  limit,
  onPageChange,
  isLoading = false,
}) => {
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, startItem + itemCount - 1);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    // Check if we have fewer items than the limit, which means we're on the last page
    const isLastPage = itemCount < limit;
    if (hasNextPage && !isLastPage) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-t dark:border-slate-600">
      <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
        <span>
          Showing {startItem} to {endItem} of {itemCount > 0 ? "many" : 0}{" "}
          results
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentPage === 1 || isLoading}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex items-center space-x-1">
          <span className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded">
            Page {currentPage}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!hasNextPage || isLoading || itemCount < limit}
          className="flex items-center gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
