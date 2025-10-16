// src/pages/AdminRentReportsPage.tsx
import { useState, useEffect } from "react";
import AdminLayout from "../components/AdminLayout";
import Card from "../components/Card";
import { Button } from "../components/ui/button";
import { Input } from "../ui/input";
import { CheckCircle, XCircle, Clock, Search } from "lucide-react";

// Skeleton component for table rows
const TableSkeleton = () => (
  <>
    {Array.from({ length: 5 }, (_, i) => (
      <tr key={i} className="animate-pulse">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 ml-2"></div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 ml-2"></div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </td>
      </tr>
    ))}
  </>
);

interface RentReport {
  userId: string;
  userSub: string;
  name: string;
  addressChanged: boolean;
  paymentDate: string;
  rentAmount: number;
  status: "Reported" | "Not Reported";
  createdAt?: string;
}

export default function AdminRentReportsPage() {
  const [reports, setReports] = useState<RentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [reportStatus, setReportStatus] = useState<
    "all" | "reported" | "not-reported"
  >("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Summary state
  const [summaryStats, setSummaryStats] = useState({
    totalUsers: 0,
    totalReportsThisMonth: 0,
  });

  useEffect(() => {
    // Clear reports when month filter or search changes to prevent showing stale data
    if (selectedMonth !== "" || searchTerm !== "") {
      setReports([]);
    }
    fetchRentReports();
  }, [currentPage, pageSize, selectedMonth, searchTerm]);

  // Separate effect for refresh button
  const handleRefresh = () => {
    fetchRentReports(true); // Reset to first page
  };

  // Debug function to clear all filters
  /* const clearAllFilters = () => {
    setSelectedMonth("");
    setSearchTerm("");
    setReportStatus("all");
    setCurrentPage(1);
  }; */

  // Handle month filter change
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setCurrentPage(1); // Reset to first page when changing month
  };

  // Handle search term change
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when searching
  };

  const fetchRentReports = async (resetToFirstPage = false) => {
    try {
      setIsLoading(true);

      // Reset to first page if requested (for refresh button)
      if (resetToFirstPage) {
        setCurrentPage(1);
      }

      const token = localStorage.getItem("adminToken");

      if (!token) {
        console.error("❌ AdminRentReports: No admin token found");
        setReports([]);
        return;
      }

      // If filtering by month/year or searching, fetch all data to filter properly
      // Otherwise use pagination
      const shouldFetchAll = selectedMonth !== "" || searchTerm !== "";
      const limit = shouldFetchAll ? "1000" : pageSize.toString(); // Large limit to get all data when filtering

      // Build query parameters
      const queryParams = new URLSearchParams({
        page: shouldFetchAll ? "1" : currentPage.toString(),
        limit: limit,
      });

      const response = await fetch(
        `https://pczfhqlzkb.execute-api.us-west-2.amazonaws.com/admin/rent-reports?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.data && data.data.reports) {
          // Set reports directly (no transformation needed for pagination)
          setReports(data.data.reports);

          // Calculate summary statistics
          calculateSummaryStats();

          // Set pagination metadata
          if (data.data.pagination) {
            if (selectedMonth !== "" || searchTerm !== "") {
              // When filtering by month or searching, show all filtered results without pagination
              setTotalPages(1);
              setTotalCount(data.data.reports.length);
            } else {
              // Normal pagination
              setTotalPages(data.data.pagination.totalPages);
              setTotalCount(data.data.pagination.totalCount);
            }
          }
        } else {
          console.error("Invalid API response format", data);
          setReports([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "Failed to fetch rent reports:",
          response.status,
          response.statusText,
          errorData
        );
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching rent reports:", error);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const formatMonthYear = (month: string, year: number) => {
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getMonthOptions = () => {
    // Get unique months from reports
    const monthSet = new Set<string>();
    reports.forEach((report) => {
      const date = new Date(
        report.paymentDate || report.createdAt || new Date()
      );
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      monthSet.add(`${year}-${month.toString().padStart(2, "0")}`);
    });

    return Array.from(monthSet)
      .map((monthYear) => {
        const [year, month] = monthYear.split("-");
        return {
          value: monthYear,
          label: formatMonthYear(month, parseInt(year)),
        };
      })
      .sort((a, b) => b.value.localeCompare(a.value)); // Sort newest first
  };

  // Calculate summary statistics
  const calculateSummaryStats = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();
    const currentMonthYear = `${currentYear}-${currentMonth
      .toString()
      .padStart(2, "0")}`;

    // Get unique users (by userSub)
    const uniqueUsers = new Set(reports.map((report) => report.userSub));
    const totalUsers = uniqueUsers.size;

    // Count total reports for this month (not unique users)
    const totalReportsThisMonth = reports.filter((report) => {
      const reportDate = new Date(report.paymentDate);
      const reportMonth = reportDate.getMonth() + 1;
      const reportYear = reportDate.getFullYear();
      const reportMonthYear = `${reportYear}-${reportMonth
        .toString()
        .padStart(2, "0")}`;
      return reportMonthYear === currentMonthYear;
    }).length;

    setSummaryStats({
      totalUsers,
      totalReportsThisMonth,
    });
  };

  const getFilteredReports = () => {
    let filteredReports = [...reports];

    // Filter by month
    if (selectedMonth) {
      filteredReports = reports.filter((report) => {
        const date = new Date(
          report.paymentDate || report.createdAt || new Date()
        );
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const reportMonthYear = `${year}-${month.toString().padStart(2, "0")}`;
        return reportMonthYear === selectedMonth;
      });
    }

    // Filter by search term (only when searching)
    if (searchTerm) {
      filteredReports = filteredReports.filter((report) => {
        const hasValidName =
          report.name && report.name.trim() !== "" && report.name !== undefined;
        const matchesSearch =
          hasValidName &&
          report.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      });
    }

    // Filter by report status
    if (reportStatus !== "all") {
      filteredReports = filteredReports.filter((report) => {
        if (reportStatus === "reported") return report.status === "Reported";
        if (reportStatus === "not-reported")
          return report.status === "Not Reported";
        return true;
      });
    }

    return filteredReports;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Reported":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "Not Reported":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Reported":
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
      case "Not Reported":
        return "text-red-600 bg-red-100 dark:bg-red-900/30";
      default:
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
    }
  };

  const filteredReports = getFilteredReports();

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Rent Reports Tracking
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor user rent reporting compliance
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Refresh Data
            </Button>
           {/*  <Button
              onClick={clearAllFilters}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Clear Filters (Debug)
            </Button> */}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Total Users
                  </h3>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {summaryStats.totalUsers}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Reports This Month
                  </h3>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {summaryStats.totalReportsThisMonth}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Current month:{" "}
                    {new Date().toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Reports Table */}
        <Card title="">
          {/* Table Header with Filters */}
          <div className="flex items-center justify-between mb-6">
            {/* Left: Title and Results Count */}
            <div className="flex items-center space-x-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Rent Reports
              </h3>
              {/* <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">
                  {totalCount}
                </span>{" "}
                total records
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                {currentPage > 1 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    💡 New reports appear on page 1
                  </div>
                )}
              </div> */}
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Right: Month Filter and Status Radio Buttons */}
            <div className="flex items-center space-x-4">
              {/* Month Filter */}
              <div className="min-w-[150px]">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Months</option>
                  {getMonthOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Report Status Radio Buttons */}
              <div className="flex items-center space-x-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="reportStatus"
                    value="all"
                    checked={reportStatus === "all"}
                    onChange={(e) => setReportStatus(e.target.value as any)}
                    className="mr-1"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    All
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="reportStatus"
                    value="reported"
                    checked={reportStatus === "reported"}
                    onChange={(e) => setReportStatus(e.target.value as any)}
                    className="mr-1"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Reported
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="reportStatus"
                    value="not-reported"
                    checked={reportStatus === "not-reported"}
                    onChange={(e) => setReportStatus(e.target.value as any)}
                    className="mr-1"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Not Reported
                  </span>
                </label>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reported Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <TableSkeleton />
                ) : filteredReports.length > 0 ? (
                  filteredReports.map((report) => (
                    <tr
                      key={report.createdAt}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {report.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(report.status)}
                          <span
                            className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              report.status
                            )}`}
                          >
                            {report.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {report.paymentDate
                          ? new Date(report.paymentDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${report.rentAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {report.addressChanged ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      No reports found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalCount > 0 && selectedMonth === "" && searchTerm === "" && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </span>{" "}
                  of <span className="font-medium">{totalCount}</span> results
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Show:
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) =>
                      handlePageSizeChange(parseInt(e.target.value))
                    }
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        className="w-8 h-8 p-0 bg-blue-600 text-white"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
